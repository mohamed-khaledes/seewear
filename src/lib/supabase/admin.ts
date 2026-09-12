import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";

export type SupabaseAdminClient = ReturnType<typeof createSupabaseClient<Database>>;

let adminClient: SupabaseAdminClient | undefined;

/**
 * Service-role client. Bypasses RLS, so it is only ever used where there is no
 * user session to trust: the Paymob webhook, guest order creation, seeding.
 * Never import this from anything that reaches the browser.
 */
export function createAdminClient(): SupabaseAdminClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase admin client needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  if (!adminClient) {
    adminClient = createSupabaseClient<Database>(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  return adminClient;
}
