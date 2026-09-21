import "server-only";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { SavedAddress } from "@/features/auth/types";

/** The signed-in customer's address book, default first. RLS scopes it. */
export async function getMyAddresses(): Promise<SavedAddress[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("addresses")
    .select("*")
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  // Before the migration lands the table does not exist; an empty book is the
  // honest answer rather than a broken checkout.
  if (error) {
    console.error("[addresses] could not read address book", error.message);
    return [];
  }
  return data ?? [];
}
