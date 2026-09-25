-- Courier bookings.
--
-- `courier`, `tracking_number` and `tracking_url` already say what the customer
-- needs. These two say who booked it and under which reference, which is what
-- the store needs to ask the courier about a parcel later: print the airway
-- bill again, cancel a pickup, or chase a delivery that never moved.
--
-- Nullable on purpose. A parcel handed over by hand, with the consignment
-- number typed into the dashboard, stays exactly as valid as a booked one.

alter table public.orders
  add column if not exists shipment_provider text,
  add column if not exists shipment_id text;

comment on column public.orders.shipment_provider is
  'Courier the parcel was booked with through their API, e.g. bosta. Null when the shipment was arranged by hand.';
comment on column public.orders.shipment_id is
  'The courier''s own id for the booking, used to reprint the airway bill.';

-- Finding an order from a courier webhook or a support call means looking it up
-- by the courier's reference, not ours.
create index if not exists orders_shipment_id_idx
  on public.orders (shipment_id)
  where shipment_id is not null;
