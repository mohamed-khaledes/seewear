-- SEEWEAR — schema.
-- All money is integer piastres (EGP x 100). Nothing here stores a float.

create extension if not exists pgcrypto;
create extension if not exists citext;
create extension if not exists pg_trgm;

-- ---------------------------------------------------------------- enums
create type public.user_role as enum ('admin', 'user');
create type public.order_status as enum ('pending', 'paid', 'fulfilled', 'cancelled', 'refunded');
create type public.product_status as enum ('active', 'draft');

-- ---------------------------------------------------------------- profiles
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  role public.user_role not null default 'user',
  is_demo boolean not null default false,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now()
);

comment on table public.profiles is '1:1 with auth.users. Role lives here and is the source of truth.';

-- ---------------------------------------------------------------- catalog
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  position int not null default 0
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  category_id uuid references public.categories (id) on delete set null,
  price_cents int not null check (price_cents >= 0),
  compare_at_cents int check (compare_at_cents is null or compare_at_cents >= 0),
  status public.product_status not null default 'draft',
  featured boolean not null default false,
  -- generated so the storefront can filter "on sale" without comparing two
  -- columns from the client
  on_sale boolean generated always as (
    compare_at_cents is not null and compare_at_cents > price_cents
  ) stored,
  created_at timestamptz not null default now()
);

create index products_status_idx on public.products (status);
create index products_category_idx on public.products (category_id);
create index products_created_idx on public.products (created_at desc);
create index products_price_idx on public.products (price_cents);
create index products_sale_idx on public.products (on_sale) where on_sale;
create index products_name_trgm_idx on public.products using gin (name gin_trgm_ops);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  url text not null,
  alt text,
  position int not null default 0
);

create index product_images_product_idx on public.product_images (product_id, position);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  color text,
  color_hex text,
  size text,
  sku text unique,
  stock int not null default 0 check (stock >= 0),
  price_cents int check (price_cents is null or price_cents >= 0)
);

create index product_variants_product_idx on public.product_variants (product_id);
create unique index product_variants_combo_idx
  on public.product_variants (product_id, coalesce(color, ''), coalesce(size, ''));

-- ---------------------------------------------------------------- cart
create table public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  updated_at timestamptz not null default now()
);

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts (id) on delete cascade,
  variant_id uuid not null references public.product_variants (id) on delete cascade,
  quantity int not null check (quantity > 0),
  unique (cart_id, variant_id)
);

create index cart_items_cart_idx on public.cart_items (cart_id);

-- ---------------------------------------------------------------- orders
-- Guest-friendly: user_id is nullable and guest orders are written server-side.
create sequence public.order_number_seq start with 4821;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique not null,
  user_id uuid references public.profiles (id) on delete set null,
  email citext not null,
  status public.order_status not null default 'pending',
  subtotal_cents int not null check (subtotal_cents >= 0),
  shipping_cents int not null default 0 check (shipping_cents >= 0),
  discount_cents int not null default 0 check (discount_cents >= 0),
  tax_cents int not null default 0 check (tax_cents >= 0),
  total_cents int not null check (total_cents >= 0),
  currency text not null default 'EGP',
  shipping_address jsonb not null,
  discount_code text,
  fulfilled_at timestamptz,
  created_at timestamptz not null default now()
);

create index orders_user_idx on public.orders (user_id);
create index orders_email_idx on public.orders (email);
create index orders_created_idx on public.orders (created_at desc);
create index orders_status_idx on public.orders (status);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  variant_id uuid references public.product_variants (id) on delete set null,
  -- snapshot at purchase time: the order must survive the product being edited
  name text not null,
  slug text,
  color text,
  size text,
  image_url text,
  price_cents int not null check (price_cents >= 0),
  quantity int not null check (quantity > 0)
);

create index order_items_order_idx on public.order_items (order_id);
create index order_items_product_idx on public.order_items (product_id);

-- ---------------------------------------------------------------- payments
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  provider text not null default 'paymob',
  paymob_order_id text,
  transaction_id text,
  method text,
  amount_cents int not null,
  status text not null,
  hmac_verified boolean not null default false,
  raw jsonb,
  created_at timestamptz not null default now()
);

create index payments_order_idx on public.payments (order_id);
create index payments_created_idx on public.payments (created_at desc);
-- makes the webhook idempotent: one row per provider transaction
create unique index payments_provider_transaction_idx
  on public.payments (provider, transaction_id)
  where transaction_id is not null;

-- ---------------------------------------------------------------- wishlist
create table public.wishlist_items (
  user_id uuid not null references public.profiles (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

-- ---------------------------------------------------------------- helpers
create or replace function public.next_order_number()
returns text
language sql
volatile
as $$
  select 'SW-' || nextval('public.order_number_seq')::text;
$$;

-- Every new auth user gets a profile. Demo flags are set by the seed script.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Role and demo flag are never self-editable: silently keep the old values
-- unless an admin is making the change.
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    new.role := old.role;
    new.is_demo := old.is_demo;
  end if;
  return new;
end;
$$;

create or replace function public.touch_cart()
returns trigger
language plpgsql
as $$
begin
  update public.carts set updated_at = now() where id = coalesce(new.cart_id, old.cart_id);
  return coalesce(new, old);
end;
$$;

create trigger cart_items_touch_cart
after insert or update or delete on public.cart_items
for each row execute function public.touch_cart();
