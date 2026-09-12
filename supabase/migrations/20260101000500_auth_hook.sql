-- SEEWEAR — custom access token hook.
-- Puts `user_role` and `is_demo` into the JWT so middleware can gate /dashboard
-- without a profiles round trip. RLS still enforces the real thing.
--
-- After running this migration, enable it in the Supabase dashboard:
--   Authentication → Hooks → Customize Access Token (JWT) Claims
--   → public.custom_access_token_hook

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  claims jsonb;
  v_role text;
  v_is_demo boolean;
begin
  select role::text, is_demo
  into v_role, v_is_demo
  from public.profiles
  where id = (event ->> 'user_id')::uuid;

  claims := coalesce(event -> 'claims', '{}'::jsonb);
  claims := jsonb_set(claims, '{user_role}', to_jsonb(coalesce(v_role, 'user')));
  claims := jsonb_set(claims, '{is_demo}', to_jsonb(coalesce(v_is_demo, false)));

  return jsonb_set(event, '{claims}', claims);
end;
$$;

grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from authenticated, anon, public;

grant select on table public.profiles to supabase_auth_admin;

create policy "auth admin can read profiles"
  on public.profiles as permissive for select
  to supabase_auth_admin
  using (true);
