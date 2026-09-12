import "server-only";

import { cache } from "react";

import {
  FREE_SHIPPING_THRESHOLD_CENTS,
  SHIPPING_FLAT_CENTS,
  TAX_RATE,
} from "@/config/constants";
import { siteConfig } from "@/config/site";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Tables } from "@/types/database.types";

export type StoreSettings = Tables<"store_settings">;

const fallback: StoreSettings = {
  id: 1,
  store_name: siteConfig.name,
  support_email: siteConfig.support.email,
  support_phone: siteConfig.support.phone,
  announcement: "BLACK FRIDAY NOW LIVE · UP TO 65% OFF",
  free_shipping_threshold_cents: FREE_SHIPPING_THRESHOLD_CENTS,
  shipping_flat_cents: SHIPPING_FLAT_CENTS,
  tax_rate: TAX_RATE,
  updated_at: new Date(0).toISOString(),
};

/**
 * Store-wide configuration, read once per render. Falls back to the values in
 * `config/` so the storefront still renders before the database exists.
 */
export const getStoreSettings = cache(async (): Promise<StoreSettings> => {
  if (!isSupabaseConfigured()) return fallback;

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("store_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    return data ?? fallback;
  } catch {
    return fallback;
  }
});
