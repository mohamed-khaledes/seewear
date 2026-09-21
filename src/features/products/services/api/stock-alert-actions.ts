"use server";

import { z } from "zod";

import { allowByAddress, RATE_LIMITED_MESSAGE } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { isServiceRoleConfigured } from "@/lib/supabase/config";

const stockAlertSchema = z.object({
  variantId: z.string().uuid(),
  email: z.string().trim().email("That email looks off"),
});

export type StockAlertResult = { ok: true } | { ok: false; error: string };

/**
 * Remembers who wants a sold-out size. Guests can ask too, so this writes with
 * the service role; the table has no browser policy at all. Asking again
 * re-arms an alert that already fired, rather than failing on the duplicate.
 */
export async function requestStockAlertAction(
  variantId: string,
  email: string,
): Promise<StockAlertResult> {
  const parsed = stockAlertSchema.safeParse({ variantId, email });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the email." };
  }

  if (!isServiceRoleConfigured()) {
    return { ok: false, error: "Stock alerts are not available on this deployment." };
  }

  if (!(await allowByAddress("stockAlert"))) {
    return { ok: false, error: RATE_LIMITED_MESSAGE };
  }

  const { error } = await createAdminClient()
    .from("stock_alerts")
    .upsert(
      { variant_id: parsed.data.variantId, email: parsed.data.email, notified_at: null },
      { onConflict: "variant_id,email" },
    );

  if (error) {
    console.error("[stock-alerts] could not save", error.message);
    return { ok: false, error: "We could not save that. Try again in a moment." };
  }

  return { ok: true };
}
