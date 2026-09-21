-- SEEWEAR — what a store needs to trade, rather than to demo.
--
--   * pricing rules the dashboard actually controls, with a rate per governorate
--   * cash on delivery
--   * stock held from the moment an order exists, and given back when it dies
--   * expiry for checkouts nobody paid, and a way back for a late payment
--   * partial refunds, restocking, tax invoice numbers
--   * saved addresses, verified-buyer reviews, back-in-stock alerts
--   * a rate limiter that works on serverless, because it lives in Postgres

-- ================================================================ helpers

-- True for requests made with the service-role key: the checkout route, the
-- Paymob webhook and the scheduled jobs. Security-definer functions run as
-- their owner, so `current_user` cannot answer this; the JWT can.
create or replace function public.is_service_role()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() ->> 'role', '') = 'service_role';
$$;

-- ================================================================ settings

alter table public.store_settings
  add column if not exists cod_enabled boolean not null default true,
  add column if not exists legal_name text,
  add column if not exists commercial_register text,
  add column if not exists tax_registration text,
  add column if not exists registered_address text;

comment on column public.store_settings.commercial_register is
  'Commercial registration number. Printed in the footer and on every invoice once set.';

-- One row per governorate that costs something other than the flat rate. A
-- governorate with no row pays `store_settings.shipping_flat_cents`, so an empty
-- table behaves exactly like the store did before this migration.
create table if not exists public.shipping_rates (
  governorate text primary key,
  rate_cents int not null check (rate_cents >= 0),
  delivery_days text,
  updated_at timestamptz not null default now()
);

alter table public.shipping_rates enable row level security;

create policy "shipping rates are public"
  on public.shipping_rates for select
  using (true);

create policy "shipping rates writable by admin"
  on public.shipping_rates for all
  using (public.can_manage_store())
  with check (public.can_manage_store());

-- ================================================================ orders

alter table public.orders
  add column if not exists payment_method text not null default 'card',
  add column if not exists stock_held boolean not null default false,
  add column if not exists expired_at timestamptz,
  add column if not exists restocked_at timestamptz,
  add column if not exists refunded_cents int not null default 0,
  add column if not exists invoice_number text;

alter table public.orders
  add constraint orders_payment_method_check check (payment_method in ('card', 'cod')),
  add constraint orders_refunded_cents_check check (refunded_cents >= 0 and refunded_cents <= total_cents),
  add constraint orders_invoice_number_key unique (invoice_number);

comment on column public.orders.stock_held is
  'True while this order has taken units out of product_variants.stock and not given them back.';
comment on column public.orders.expired_at is
  'Set when the expiry job cancelled an unpaid card order. A payment that lands afterwards still completes it.';

create index if not exists orders_pending_card_idx
  on public.orders (created_at)
  where status = 'pending' and payment_method = 'card';

-- Everything that has already sold took its stock when the webhook applied it.
update public.orders
set stock_held = true
where status in ('paid', 'fulfilled', 'delivered', 'refunded');

-- ---------------------------------------------------------------- invoices

create sequence if not exists public.invoice_number_seq start with 1001;

-- A tax invoice number, separate from the order number and gap-free in the
-- order sales happened. Issued the moment an order becomes a sale — paid by
-- card, or confirmed for cash on delivery — and never reissued.
create or replace function public.assign_invoice_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.invoice_number is null and new.status not in ('pending', 'cancelled') then
    new.invoice_number := 'INV-' || to_char(now(), 'YYYY') || '-'
      || lpad(nextval('public.invoice_number_seq')::text, 6, '0');
  end if;
  return new;
end;
$$;

create trigger orders_assign_invoice
before insert or update of status on public.orders
for each row execute function public.assign_invoice_number();

-- Number the sales that happened before invoices existed, oldest first.
do $$
declare
  v_order record;
begin
  for v_order in
    select id, created_at
    from public.orders
    where invoice_number is null and status not in ('pending', 'cancelled')
    order by created_at
  loop
    update public.orders
    set invoice_number = 'INV-' || to_char(v_order.created_at, 'YYYY') || '-'
      || lpad(nextval('public.invoice_number_seq')::text, 6, '0')
    where id = v_order.id;
  end loop;
end;
$$;

-- ================================================================ stock

-- Takes an order's units out of stock, all of them or none. Locks variants in
-- a fixed order so two checkouts racing for the same pieces cannot deadlock.
-- Raises `insufficient_stock` rather than returning false: a raise rolls back
-- the decrements already made in this call, a return would keep them.
create or replace function public.hold_order_stock(p_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_held boolean;
  v_line record;
  v_stock int;
begin
  select stock_held into v_held
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'order % not found', p_order_id;
  end if;

  if v_held then
    return true;
  end if;

  for v_line in
    select variant_id, sum(quantity)::int as qty
    from public.order_items
    where order_id = p_order_id and variant_id is not null
    group by variant_id
    order by variant_id
  loop
    select stock into v_stock
    from public.product_variants
    where id = v_line.variant_id
    for update;

    if v_stock is null or v_stock < v_line.qty then
      raise exception 'insufficient_stock:%', v_line.variant_id;
    end if;

    update public.product_variants
    set stock = stock - v_line.qty
    where id = v_line.variant_id;
  end loop;

  update public.orders set stock_held = true where id = p_order_id;
  return true;
end;
$$;

revoke execute on function public.hold_order_stock(uuid) from public, anon, authenticated;
grant execute on function public.hold_order_stock(uuid) to service_role;

-- Gives an order's units back. Safe to call twice: the second call finds
-- nothing held and does nothing.
create or replace function public.release_order_stock(p_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_held boolean;
  v_line record;
begin
  if not (public.can_manage_store() or public.is_service_role()) then
    raise exception 'not authorised';
  end if;

  select stock_held into v_held
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'order % not found', p_order_id;
  end if;

  if not v_held then
    return false;
  end if;

  for v_line in
    select variant_id, sum(quantity)::int as qty
    from public.order_items
    where order_id = p_order_id and variant_id is not null
    group by variant_id
    order by variant_id
  loop
    update public.product_variants
    set stock = stock + v_line.qty
    where id = v_line.variant_id;
  end loop;

  update public.orders
  set stock_held = false, restocked_at = now()
  where id = p_order_id;

  return true;
end;
$$;

-- Granted explicitly rather than inherited from PUBLIC: the admin check inside
-- is what decides, and the grant only has to let the call reach it.
revoke execute on function public.release_order_stock(uuid) from public, anon;
grant execute on function public.release_order_stock(uuid) to authenticated, service_role;

-- ================================================================ lifecycle

-- The one way an order becomes paid, still only reachable from the service
-- role. Two changes from the original:
--   * stock already held at checkout is not taken a second time;
--   * an order the expiry job cancelled can still be paid. The customer's
--     money has moved, so the order has to follow it — with a note, because
--     the stock it gave back may have sold in the meantime.
create or replace function public.apply_paid_order(p_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status public.order_status;
  v_held boolean;
  v_expired timestamptz;
  v_line record;
begin
  select status, stock_held, expired_at
  into v_status, v_held, v_expired
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'order % not found', p_order_id;
  end if;

  if not (v_status = 'pending' or (v_status = 'cancelled' and v_expired is not null)) then
    return false;
  end if;

  if not v_held then
    for v_line in
      select variant_id, sum(quantity)::int as qty
      from public.order_items
      where order_id = p_order_id and variant_id is not null
      group by variant_id
      order by variant_id
    loop
      update public.product_variants
      set stock = greatest(stock - v_line.qty, 0)
      where id = v_line.variant_id;
    end loop;
  end if;

  update public.orders
  set status = 'paid',
      stock_held = true,
      status_note = case
        when v_status = 'cancelled'
          then 'Paid after the checkout had expired. Check stock before packing.'
        else null
      end
  where id = p_order_id;

  return true;
end;
$$;

revoke execute on function public.apply_paid_order(uuid) from public, anon, authenticated;
grant execute on function public.apply_paid_order(uuid) to service_role;

-- A card checkout nobody finished. Only ever called by the scheduled job, and
-- only after Paymob has been asked and said the order is not paid.
create or replace function public.expire_order(p_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status public.order_status;
  v_method text;
begin
  select status, payment_method into v_status, v_method
  from public.orders
  where id = p_order_id
  for update;

  if not found or v_status <> 'pending' or v_method <> 'card' then
    return false;
  end if;

  perform public.release_order_stock(p_order_id);

  update public.orders
  set status = 'cancelled',
      expired_at = now(),
      status_note = 'Payment was not completed, so the pieces went back on sale.'
  where id = p_order_id;

  return true;
end;
$$;

revoke execute on function public.expire_order(uuid) from public, anon, authenticated;
grant execute on function public.expire_order(uuid) to service_role;

-- Cancelling gives the stock back in the same transaction, so a cancelled
-- order can never keep pieces off the shelf. A cash order can also be
-- cancelled after it shipped: that is a parcel refused at the door, coming back.
create or replace function public.cancel_order(p_order_id uuid, p_note text default null)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status public.order_status;
  v_method text;
begin
  if not (public.can_manage_store() or public.is_service_role()) then
    raise exception 'not authorised';
  end if;

  select status, payment_method into v_status, v_method
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    return false;
  end if;

  if not (
    v_status in ('pending', 'confirmed')
    or (v_status = 'fulfilled' and v_method = 'cod')
  ) then
    return false;
  end if;

  perform public.release_order_stock(p_order_id);

  update public.orders
  set status = 'cancelled',
      status_note = nullif(btrim(coalesce(p_note, '')), '')
  where id = p_order_id;

  return true;
end;
$$;

revoke execute on function public.cancel_order(uuid, text) from public, anon;
grant execute on function public.cancel_order(uuid, text) to authenticated, service_role;

-- ================================================================ discounts

alter table public.discount_codes
  add column if not exists usage_limit int,
  add column if not exists once_per_customer boolean not null default false;

alter table public.discount_codes
  add constraint discount_codes_usage_limit_check check (usage_limit is null or usage_limit > 0);

-- ================================================================ addresses

create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  label text check (char_length(label) <= 30),
  full_name text not null,
  phone text not null,
  line1 text not null,
  line2 text,
  city text not null,
  governorate text not null,
  postal_code text,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists addresses_user_idx on public.addresses (user_id, created_at);
create unique index if not exists addresses_one_default_idx
  on public.addresses (user_id)
  where is_default;

alter table public.addresses enable row level security;

create policy "addresses are owner only"
  on public.addresses for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "addresses readable by admin"
  on public.addresses for select
  using (public.is_admin());

-- ================================================================ reviews

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  title text check (char_length(title) <= 80),
  body text check (char_length(body) <= 1500),
  author_name text not null check (char_length(author_name) <= 60),
  created_at timestamptz not null default now(),
  unique (product_id, user_id)
);

create index if not exists reviews_product_idx on public.reviews (product_id, created_at desc);

alter table public.reviews enable row level security;

create policy "reviews are public"
  on public.reviews for select
  using (true);

-- Verified buyers only: the reviewer must have received this product.
create policy "reviews by people who received the piece"
  on public.reviews for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.orders o
      join public.order_items i on i.order_id = o.id
      where o.user_id = auth.uid()
        and o.status = 'delivered'
        and i.product_id = reviews.product_id
    )
  );

create policy "reviews editable by their author"
  on public.reviews for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "reviews removable by author or admin"
  on public.reviews for delete
  using (user_id = auth.uid() or public.can_manage_store());

-- ================================================================ stock alerts

-- Guests can ask too, so rows are written by the server with the service-role
-- key rather than through a browser policy.
create table if not exists public.stock_alerts (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants (id) on delete cascade,
  email citext not null,
  created_at timestamptz not null default now(),
  notified_at timestamptz,
  unique (variant_id, email)
);

create index if not exists stock_alerts_waiting_idx
  on public.stock_alerts (variant_id)
  where notified_at is null;

alter table public.stock_alerts enable row level security;

create policy "stock alerts readable by admin"
  on public.stock_alerts for select
  using (public.is_admin());

-- ================================================================ rate limits

-- A fixed-window counter. It lives in Postgres because an in-memory limiter on
-- serverless counts per instance, and a store gets many instances under load.
create table if not exists public.rate_limits (
  key text primary key,
  window_start timestamptz not null default now(),
  hits int not null default 0
);

alter table public.rate_limits enable row level security;
-- No policies: only the service role touches this table.

create or replace function public.hit_rate_limit(p_key text, p_window_seconds int, p_max int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hits int;
begin
  insert into public.rate_limits as r (key, window_start, hits)
  values (p_key, now(), 1)
  on conflict (key) do update
    set hits = case
          when r.window_start < now() - make_interval(secs => p_window_seconds) then 1
          else r.hits + 1
        end,
        window_start = case
          when r.window_start < now() - make_interval(secs => p_window_seconds) then now()
          else r.window_start
        end
  returning hits into v_hits;

  return v_hits <= p_max;
end;
$$;

revoke execute on function public.hit_rate_limit(text, int, int) from public, anon, authenticated;
grant execute on function public.hit_rate_limit(text, int, int) to service_role;
