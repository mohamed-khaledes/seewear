-- Fixes the guard added in 20260101000000_init.sql.
--
-- `protect_profile_columns()` reverted `role` and `is_demo` whenever
-- `is_admin()` was false. `auth.uid()` is NULL under the service role, so
-- `is_admin()` is false there too — which meant every trusted server-side write
-- had those columns silently stripped. The seed's upsert returned no error while
-- discarding the values, so the demo admin ended up with role 'user' and neither
-- demo account was ever flagged.
--
-- Authenticated non-admins are still clamped, which is the case the guard exists
-- for. A NULL uid only ever means a service-role, migration or seed context:
-- anon cannot reach this trigger at all, because both UPDATE policies on
-- profiles require either `id = auth.uid()` or `can_manage_store()`.

create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.role := old.role;
    new.is_demo := old.is_demo;
  end if;
  return new;
end;
$$;
