-- SEEWEAR — the operations that must be atomic or must not be trusted to the client.

-- ----------------------------------------------------------------
-- Marks a pending order paid and decrements stock in one transaction.
-- Returns false when the order was already applied, which is what makes the
-- Paymob webhook safe to replay: no double decrement, no second email.
-- ----------------------------------------------------------------
create or replace function public.apply_paid_order(p_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status public.order_status;
  v_line record;
begin
  select status into v_status
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'order % not found', p_order_id;
  end if;

  -- Already paid, fulfilled, cancelled or refunded: nothing to do.
  if v_status <> 'pending' then
    return false;
  end if;

  for v_line in
    select variant_id, sum(quantity)::int as qty
    from public.order_items
    where order_id = p_order_id and variant_id is not null
    group by variant_id
  loop
    update public.product_variants
    set stock = greatest(stock - v_line.qty, 0)
    where id = v_line.variant_id;
  end loop;

  update public.orders set status = 'paid' where id = p_order_id;

  return true;
end;
$$;

revoke execute on function public.apply_paid_order(uuid) from public, anon, authenticated;

-- ----------------------------------------------------------------
-- Merge-on-login: union the localStorage cart into the user's DB cart by
-- variant, summing quantities and capping each line at available stock.
-- Runs as the caller, so the owner-only cart policies still apply.
-- ----------------------------------------------------------------
create or replace function public.merge_guest_cart(p_items jsonb)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_cart_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  insert into public.carts (user_id)
  values (auth.uid())
  on conflict (user_id) do update set updated_at = now()
  returning id into v_cart_id;

  insert into public.cart_items (cart_id, variant_id, quantity)
  select
    v_cart_id,
    incoming.variant_id,
    incoming.quantity
  from (
    select
      (item ->> 'variant_id')::uuid as variant_id,
      greatest(sum((item ->> 'quantity')::int), 1)::int as quantity
    from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) as item
    where item ->> 'variant_id' is not null
    group by 1
  ) as incoming
  join public.product_variants v on v.id = incoming.variant_id
  on conflict (cart_id, variant_id) do update
    set quantity = cart_items.quantity + excluded.quantity;

  -- Never let a merged line exceed stock, and drop anything sold out.
  update public.cart_items ci
  set quantity = least(ci.quantity, v.stock)
  from public.product_variants v
  where v.id = ci.variant_id
    and ci.cart_id = v_cart_id
    and ci.quantity > v.stock
    and v.stock > 0;

  delete from public.cart_items ci
  using public.product_variants v
  where v.id = ci.variant_id and ci.cart_id = v_cart_id and v.stock = 0;
end;
$$;

-- ----------------------------------------------------------------
-- Everything the dashboard overview needs, in one round trip.
-- ----------------------------------------------------------------
create or replace function public.admin_dashboard_stats(p_days int default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_from timestamptz := now() - make_interval(days => p_days);
  v_prev_from timestamptz := now() - make_interval(days => p_days * 2);
  v_result jsonb;
begin
  if not public.is_admin() then
    raise exception 'not authorised';
  end if;

  with paid as (
    select * from public.orders
    where status in ('paid', 'fulfilled') and created_at >= v_from
  ),
  prev_paid as (
    select * from public.orders
    where status in ('paid', 'fulfilled')
      and created_at >= v_prev_from and created_at < v_from
  ),
  current_totals as (
    select
      coalesce(sum(total_cents), 0)::bigint as revenue_cents,
      count(*)::int as orders_count
    from paid
  ),
  previous_totals as (
    select
      coalesce(sum(total_cents), 0)::bigint as revenue_cents,
      count(*)::int as orders_count
    from prev_paid
  ),
  funnel as (
    select
      count(*) filter (where status in ('paid', 'fulfilled'))::int as completed,
      count(*)::int as started
    from public.orders
    where created_at >= v_from
  ),
  prev_funnel as (
    select
      count(*) filter (where status in ('paid', 'fulfilled'))::int as completed,
      count(*)::int as started
    from public.orders
    where created_at >= v_prev_from and created_at < v_from
  ),
  series as (
    select
      d::date as day,
      coalesce(sum(p.total_cents), 0)::bigint as revenue_cents
    from generate_series(v_from::date, now()::date, interval '1 day') as d
    left join paid p on p.created_at::date = d::date
    group by d
    order by d
  ),
  top_products as (
    select
      oi.product_id,
      max(oi.name) as name,
      max(oi.image_url) as image_url,
      sum(oi.price_cents * oi.quantity)::bigint as revenue_cents,
      sum(oi.quantity)::int as units
    from public.order_items oi
    join paid p on p.id = oi.order_id
    group by oi.product_id
    order by revenue_cents desc
    limit 5
  ),
  recent as (
    select
      o.id,
      o.order_number,
      o.email,
      o.status,
      o.total_cents,
      o.created_at,
      coalesce(pr.full_name, split_part(o.email::text, '@', 1)) as customer,
      (select coalesce(sum(quantity), 0) from public.order_items i where i.order_id = o.id)::int as item_count
    from public.orders o
    left join public.profiles pr on pr.id = o.user_id
    order by o.created_at desc
    limit 6
  )
  select jsonb_build_object(
    'range_days', p_days,
    'revenue_cents', (select revenue_cents from current_totals),
    'previous_revenue_cents', (select revenue_cents from previous_totals),
    'orders_count', (select orders_count from current_totals),
    'previous_orders_count', (select orders_count from previous_totals),
    'aov_cents', case
      when (select orders_count from current_totals) = 0 then 0
      else ((select revenue_cents from current_totals) / (select orders_count from current_totals))::bigint
    end,
    'previous_aov_cents', case
      when (select orders_count from previous_totals) = 0 then 0
      else ((select revenue_cents from previous_totals) / (select orders_count from previous_totals))::bigint
    end,
    'completion_rate', case
      when (select started from funnel) = 0 then 0
      else round((select completed::numeric from funnel) / (select started from funnel) * 100, 1)
    end,
    'previous_completion_rate', case
      when (select started from prev_funnel) = 0 then 0
      else round((select completed::numeric from prev_funnel) / (select started from prev_funnel) * 100, 1)
    end,
    'series', (select coalesce(jsonb_agg(jsonb_build_object('day', day, 'revenue_cents', revenue_cents)), '[]'::jsonb) from series),
    'top_products', (select coalesce(jsonb_agg(to_jsonb(top_products)), '[]'::jsonb) from top_products),
    'recent_orders', (select coalesce(jsonb_agg(to_jsonb(recent)), '[]'::jsonb) from recent),
    'low_stock', (
      select coalesce(jsonb_agg(t), '[]'::jsonb) from (
        select p.name, p.slug, v.color, v.size, v.stock
        from public.product_variants v
        join public.products p on p.id = v.product_id
        where v.stock <= 5 and p.status = 'active'
        order by v.stock asc
        limit 6
      ) t
    )
  )
  into v_result;

  return v_result;
end;
$$;

revoke execute on function public.admin_dashboard_stats(int) from anon;

-- ----------------------------------------------------------------
-- Mirrors the client cart into the user's DB cart. Called after a merge and
-- whenever a signed-in customer changes their bag, so the cart follows them
-- between devices. Quantities are capped at stock; sold-out lines are dropped.
-- ----------------------------------------------------------------
create or replace function public.replace_cart(p_items jsonb)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_cart_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  insert into public.carts (user_id)
  values (auth.uid())
  on conflict (user_id) do update set updated_at = now()
  returning id into v_cart_id;

  delete from public.cart_items where cart_id = v_cart_id;

  insert into public.cart_items (cart_id, variant_id, quantity)
  select v_cart_id, incoming.variant_id, least(incoming.quantity, v.stock)
  from (
    select
      (item ->> 'variant_id')::uuid as variant_id,
      greatest(sum((item ->> 'quantity')::int), 1)::int as quantity
    from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) as item
    where item ->> 'variant_id' is not null
    group by 1
  ) as incoming
  join public.product_variants v on v.id = incoming.variant_id
  where v.stock > 0;
end;
$$;
