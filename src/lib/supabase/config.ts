/**
 * Whether Supabase credentials are present. Read paths check this so a fresh
 * clone renders empty states instead of crashing before `.env.local` is filled
 * in. It is never a substitute for an auth check.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function isServiceRoleConfigured(): boolean {
  return isSupabaseConfigured() && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}
