-- SEEWEAR — two more order states.
--
-- `delivered`, so the customer's timeline does not stop at "handed to the
-- courier". `confirmed`, for a cash-on-delivery order: accepted and holding
-- stock, but with no money taken yet — which is exactly what `paid` must never
-- claim.
--
-- These sit in a file of their own because Postgres refuses to let a new enum
-- value be *used* in the same transaction that adds it, and the Supabase CLI
-- wraps each migration file in one transaction. Everything that reads or writes
-- either value lives in the later migrations.

alter type public.order_status add value if not exists 'confirmed' after 'pending';
alter type public.order_status add value if not exists 'delivered' after 'fulfilled';
