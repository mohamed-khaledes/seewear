-- SEEWEAR — order tracking.
--
-- Two things a customer asks that the schema could not answer: *when* did each
-- step happen, and *where is the parcel now*.
--
-- `order_events` is the dated trail. It is written by a trigger rather than by
-- the dashboard, so it stays complete no matter who moved the order — a
-- dashboard action, the Paymob webhook, or a statement run by hand. The courier
-- columns carry the consignment number the customer can take to the courier.

alter table public.orders
  add column if not exists courier text,
  add column if not exists tracking_number text,
  add column if not exists tracking_url text,
  add column if not exists status_note text,
  add column if not exists delivered_at timestamptz;

comment on column public.orders.status_note is
  'The note written alongside the most recent status change. The trigger below copies it onto the event.';

create table if not exists public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  status public.order_status not null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists order_events_order_idx
  on public.order_events (order_id, created_at);

alter table public.order_events enable row level security;

-- The same reach as the order itself: its owner, and admins. A guest order has
-- no owner, so the storefront reads those through the server with the
-- service-role key, after matching the order number against the email.
create policy "order events follow their order"
  on public.order_events for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_id and (o.user_id = auth.uid() or public.is_admin())
    )
  );

-- No insert policy on purpose: the trigger below is the only writer, and it is
-- security definer, so it writes as the owner rather than as the caller.
create or replace function public.log_order_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.order_events (order_id, status, note)
    values (new.id, new.status, nullif(btrim(coalesce(new.status_note, '')), ''));
  end if;
  return null;
end;
$$;

create trigger orders_log_status
after insert or update of status on public.orders
for each row execute function public.log_order_status();

-- Orders placed before this migration deserve a first step too, otherwise their
-- timeline would render empty.
insert into public.order_events (order_id, status, created_at)
select o.id, o.status, o.created_at
from public.orders o
where not exists (
  select 1 from public.order_events e where e.order_id = o.id
);
