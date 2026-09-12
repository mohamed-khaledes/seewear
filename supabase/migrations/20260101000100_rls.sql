-- SEEWEAR — row level security.
-- The client is never trusted for role or price. Guest orders are written with
-- the service-role key from the server, which bypasses these policies.

-- ---------------------------------------------------------------- helpers
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_demo()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_demo from public.profiles where id = auth.uid()),
    false
  );
$$;

-- Demo accounts can browse and shop, but never mutate the store itself.
create or replace function public.can_manage_store()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin() and not public.is_demo();
$$;

-- These three stay executable by anon on purpose: RLS policies below call them
-- while evaluating rows for signed-out visitors (a draft product makes the
-- `status = 'active'` branch false, so is_admin() really does get called).
-- They only report on the current session and leak nothing.

-- Now that is_admin() exists, guard the self-editable profile columns.
create trigger profiles_protect_columns
before update on public.profiles
for each row execute function public.protect_profile_columns();

-- ---------------------------------------------------------------- enable
alter table public.profiles          enable row level security;
alter table public.categories        enable row level security;
alter table public.products          enable row level security;
alter table public.product_images    enable row level security;
alter table public.product_variants  enable row level security;
alter table public.carts             enable row level security;
alter table public.cart_items        enable row level security;
alter table public.orders            enable row level security;
alter table public.order_items       enable row level security;
alter table public.payments          enable row level security;
alter table public.wishlist_items    enable row level security;

-- ---------------------------------------------------------------- profiles
create policy "profiles readable by owner or admin"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin());

create policy "profiles updatable by owner"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles manageable by admin"
  on public.profiles for update
  using (public.can_manage_store())
  with check (public.can_manage_store());

-- ---------------------------------------------------------------- catalog
create policy "categories are public"
  on public.categories for select
  using (true);

create policy "categories writable by admin"
  on public.categories for all
  using (public.can_manage_store())
  with check (public.can_manage_store());

create policy "active products are public"
  on public.products for select
  using (status = 'active' or public.is_admin());

create policy "products writable by admin"
  on public.products for all
  using (public.can_manage_store())
  with check (public.can_manage_store());

create policy "images of visible products are public"
  on public.product_images for select
  using (
    exists (
      select 1 from public.products p
      where p.id = product_id and (p.status = 'active' or public.is_admin())
    )
  );

create policy "images writable by admin"
  on public.product_images for all
  using (public.can_manage_store())
  with check (public.can_manage_store());

create policy "variants of visible products are public"
  on public.product_variants for select
  using (
    exists (
      select 1 from public.products p
      where p.id = product_id and (p.status = 'active' or public.is_admin())
    )
  );

create policy "variants writable by admin"
  on public.product_variants for all
  using (public.can_manage_store())
  with check (public.can_manage_store());

-- ---------------------------------------------------------------- cart
create policy "carts are owner only"
  on public.carts for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "cart items are owner only"
  on public.cart_items for all
  using (
    exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid())
  );

-- ---------------------------------------------------------------- wishlist
create policy "wishlist is owner only"
  on public.wishlist_items for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------- orders
-- No insert policy on purpose: orders are created server-side, with totals
-- recomputed from the database.
create policy "orders readable by owner or admin"
  on public.orders for select
  using (user_id = auth.uid() or public.is_admin());

create policy "orders updatable by admin"
  on public.orders for update
  using (public.can_manage_store())
  with check (public.can_manage_store());

create policy "order items follow their order"
  on public.order_items for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_id and (o.user_id = auth.uid() or public.is_admin())
    )
  );

-- ---------------------------------------------------------------- payments
create policy "payments follow their order"
  on public.payments for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_id and (o.user_id = auth.uid() or public.is_admin())
    )
  );
