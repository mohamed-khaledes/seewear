-- SEEWEAR — count delivered orders as revenue.
--
-- `admin_dashboard_stats` counted an order towards revenue, AOV, the chart, the
-- top products and the conversion rate while it was 'paid' or 'fulfilled'. Adding
-- 'delivered' to the order journey would otherwise have made every completed
-- order fall out of the overview the moment it arrived at the customer.
--
-- The body below is the function from ..._functions.sql with 'delivered' added to
-- its four status lists, and nothing else changed.

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
    where status in ('paid', 'fulfilled', 'delivered') and created_at >= v_from
  ),
  prev_paid as (
    select * from public.orders
    where status in ('paid', 'fulfilled', 'delivered')
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
      count(*) filter (where status in ('paid', 'fulfilled', 'delivered'))::int as completed,
      count(*)::int as started
    from public.orders
    where created_at >= v_from
  ),
  prev_funnel as (
    select
      count(*) filter (where status in ('paid', 'fulfilled', 'delivered'))::int as completed,
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
