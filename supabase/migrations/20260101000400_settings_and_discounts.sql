-- SEEWEAR — store configuration and discount codes.
-- Additive to the core model: the dashboard Settings and Discounts panes and the
-- checkout discount field read from here.

create table public.store_settings (
  id smallint primary key default 1 check (id = 1),
  store_name text not null default 'SEEWEAR',
  support_email text not null default 'help@seewear.store',
  support_phone text,
  announcement text,
  free_shipping_threshold_cents int not null default 400000,
  shipping_flat_cents int not null default 8000,
  tax_rate numeric(5, 4) not null default 0.14 check (tax_rate >= 0 and tax_rate < 1),
  updated_at timestamptz not null default now()
);

insert into public.store_settings (id, announcement)
values (1, 'BLACK FRIDAY NOW LIVE · UP TO 65% OFF')
on conflict (id) do nothing;

create table public.discount_codes (
  id uuid primary key default gen_random_uuid(),
  code citext unique not null,
  percent_off int check (percent_off is null or (percent_off > 0 and percent_off <= 100)),
  amount_off_cents int check (amount_off_cents is null or amount_off_cents > 0),
  min_subtotal_cents int not null default 0 check (min_subtotal_cents >= 0),
  active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  constraint discount_has_exactly_one_rule check (
    (percent_off is null) <> (amount_off_cents is null)
  )
);

alter table public.store_settings enable row level security;
alter table public.discount_codes enable row level security;

-- The announcement bar and shipping thresholds are public information.
create policy "store settings are public"
  on public.store_settings for select
  using (true);

create policy "store settings writable by admin"
  on public.store_settings for update
  using (public.can_manage_store())
  with check (public.can_manage_store());

-- Codes are never enumerable from the browser; checkout validates them
-- server-side with the service-role client.
create policy "discount codes readable by admin"
  on public.discount_codes for select
  using (public.is_admin());

create policy "discount codes writable by admin"
  on public.discount_codes for all
  using (public.can_manage_store())
  with check (public.can_manage_store());
