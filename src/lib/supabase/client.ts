"use client";

import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/types/database.types";

export type SupabaseBrowserClient = ReturnType<typeof createBrowserClient<Database>>;

let browserClient: SupabaseBrowserClient | undefined;

/** Cookie-backed Supabase client for Client Components. Safe to call repeatedly. */
export function createClient(): SupabaseBrowserClient {
  if (!browserClient) {
    browserClient = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return browserClient;
}
