import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import type { Database } from "@/types/database.types";

export type SupabaseServerClient = ReturnType<typeof createServerClient<Database>>;

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 * Reads and writes the session cookies, so every query runs as the signed-in
 * user and RLS applies.
 */
export async function createClient(): Promise<SupabaseServerClient> {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component — middleware refreshes the session
            // instead, so this is safe to ignore.
          }
        },
      },
    },
  );
}
