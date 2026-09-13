-- SEEWEAR — a delivered state, so the customer's timeline does not stop at
-- "handed to the courier".
--
-- This sits in a file of its own because Postgres refuses to let a new enum
-- value be *used* in the same transaction that adds it, and the Supabase CLI
-- wraps each migration file in one transaction. Everything that reads or writes
-- 'delivered' lives in the next migration.
--
-- Placed after 'fulfilled' so the enum's own order still reads as the journey.

alter type public.order_status add value if not exists 'delivered' after 'fulfilled';
