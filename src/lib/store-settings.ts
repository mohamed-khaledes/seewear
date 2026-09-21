import "server-only";

import { cache } from "react";
import { unstable_rethrow } from "next/navigation";

import {
  FREE_SHIPPING_THRESHOLD_CENTS,
  SHIPPING_FLAT_CENTS,
  TAX_RATE,
} from "@/config/constants";
import { siteConfig } from "@/config/site";
import { DEFAULT_PRICING_RULES, type PricingRules } from "@/lib/pricing";
import type { SupabaseAdminClient } from "@/lib/supabase/admin";
import { createClient, type SupabaseServerClient } from "@/lib/supabase/server";
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
  cod_enabled: true,
  legal_name: null,
  commercial_register: null,
  tax_registration: null,
  registered_address: null,
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
  } catch (error) {
    // Next signals "this page must render dynamically" by throwing. Swallowing
    // that would let a page be prerendered once with fallback values and
    // served stale forever, so let Next's own errors through first.
    unstable_rethrow(error);
    return fallback;
  }
});

/**
 * The pricing rules from any client — the session one for rendering, the
 * service-role one inside checkout. Both tables are public-read, so the answer
 * is the same either way.
 */
export async function loadPricingRules(
  client: SupabaseServerClient | SupabaseAdminClient,
): Promise<PricingRules> {
  const [settings, rates] = await Promise.all([
    client
      .from("store_settings")
      .select("shipping_flat_cents, free_shipping_threshold_cents, tax_rate, cod_enabled")
      .eq("id", 1)
      .maybeSingle(),
    client.from("shipping_rates").select("governorate, rate_cents"),
  ]);

  if (settings.error || !settings.data) {
    console.error("[pricing] store settings unreadable, using defaults", settings.error);
    return DEFAULT_PRICING_RULES;
  }

  return {
    shippingFlatCents: settings.data.shipping_flat_cents,
    freeShippingThresholdCents: settings.data.free_shipping_threshold_cents,
    taxRate: Number(settings.data.tax_rate),
    codEnabled: settings.data.cod_enabled,
    // A missing table (migration not pushed yet) just means no regional rates.
    governorateRates: Object.fromEntries(
      (rates.data ?? []).map((row) => [row.governorate, row.rate_cents]),
    ),
  };
}

export const getPricingRules = cache(async (): Promise<PricingRules> => {
  if (!isSupabaseConfigured()) return DEFAULT_PRICING_RULES;
  try {
    return await loadPricingRules(await createClient());
  } catch (error) {
    unstable_rethrow(error);
    console.error("[pricing] could not load rules", error);
    return DEFAULT_PRICING_RULES;
  }
});
