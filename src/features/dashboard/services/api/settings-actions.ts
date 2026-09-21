"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { toPiastres } from "@/lib/utils";
import { assertCanManageStore } from "./guards.server";
import {
  discountFormSchema,
  shippingRatesFormSchema,
  storeSettingsFormSchema,
  type ActionResult,
  type DiscountFormValues,
  type ShippingRatesFormValues,
  type StoreSettingsFormValues,
} from "@/features/dashboard/types";

/**
 * Prices, shipping and VAT are read by every storefront page and by checkout,
 * so a settings change has to reach all of them, not just this screen.
 */
function revalidateStorefront() {
  revalidatePath("/dashboard/settings");
  revalidatePath("/", "layout");
}

export async function updateStoreSettingsAction(
  values: StoreSettingsFormValues,
): Promise<ActionResult> {
  const blocked = await assertCanManageStore();
  if (blocked) return blocked;

  const parsed = storeSettingsFormSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("store_settings")
    .update({
      store_name: parsed.data.storeName,
      support_email: parsed.data.supportEmail,
      support_phone: parsed.data.supportPhone || null,
      announcement: parsed.data.announcement || null,
      free_shipping_threshold_cents: toPiastres(parsed.data.freeShippingThreshold),
      shipping_flat_cents: toPiastres(parsed.data.shippingFlat),
      tax_rate: parsed.data.taxRatePercent / 100,
      cod_enabled: parsed.data.codEnabled,
      legal_name: parsed.data.legalName || null,
      commercial_register: parsed.data.commercialRegister || null,
      tax_registration: parsed.data.taxRegistration || null,
      registered_address: parsed.data.registeredAddress || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  if (error) return { ok: false, error: "We could not save those settings." };

  revalidateStorefront();
  return { ok: true };
}

/**
 * Replaces the per-governorate rates. A governorate left blank is removed, so
 * it goes back to paying the flat rate — which is also what an empty table
 * means.
 */
export async function saveShippingRatesAction(
  values: ShippingRatesFormValues,
): Promise<ActionResult> {
  const blocked = await assertCanManageStore();
  if (blocked) return blocked;

  const parsed = shippingRatesFormSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the rates." };
  }

  const supabase = await createClient();
  const set = parsed.data.rows.filter((row) => row.rate !== null);
  const cleared = parsed.data.rows
    .filter((row) => row.rate === null)
    .map((row) => row.governorate);

  if (set.length > 0) {
    const { error } = await supabase.from("shipping_rates").upsert(
      set.map((row) => ({
        governorate: row.governorate,
        rate_cents: toPiastres(row.rate ?? 0),
        delivery_days: row.deliveryDays || null,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: "governorate" },
    );
    if (error) return { ok: false, error: "We could not save those rates." };
  }

  if (cleared.length > 0) {
    const { error } = await supabase.from("shipping_rates").delete().in("governorate", cleared);
    if (error) return { ok: false, error: "We could not clear those rates." };
  }

  revalidateStorefront();
  revalidatePath("/help/shipping");
  return { ok: true };
}

export async function saveDiscountAction(
  values: DiscountFormValues,
  id?: string,
): Promise<ActionResult> {
  const blocked = await assertCanManageStore();
  if (blocked) return blocked;

  const parsed = discountFormSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  const row = {
    code: parsed.data.code.toUpperCase(),
    percent_off: parsed.data.kind === "percent" ? parsed.data.percentOff : null,
    amount_off_cents:
      parsed.data.kind === "amount" ? toPiastres(parsed.data.amountOff) : null,
    min_subtotal_cents: toPiastres(parsed.data.minSubtotal),
    active: parsed.data.active,
    usage_limit: parsed.data.usageLimit > 0 ? parsed.data.usageLimit : null,
    once_per_customer: parsed.data.oncePerCustomer,
    // End of the chosen day on Egyptian standard time, so a code "until the
    // 30th" works all of the 30th.
    expires_at: parsed.data.expiresOn
      ? new Date(`${parsed.data.expiresOn}T23:59:59+02:00`).toISOString()
      : null,
  };

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("discount_codes").update(row).eq("id", id)
    : await supabase.from("discount_codes").insert(row);

  if (error) {
    return {
      ok: false,
      error:
        error.code === "23505" ? "That code already exists." : "We could not save that code.",
    };
  }

  revalidatePath("/dashboard/discounts");
  return { ok: true };
}

export async function deleteDiscountAction(id: string): Promise<ActionResult> {
  const blocked = await assertCanManageStore();
  if (blocked) return blocked;

  const supabase = await createClient();
  const { error } = await supabase.from("discount_codes").delete().eq("id", id);

  if (error) return { ok: false, error: "We could not delete that code." };

  revalidatePath("/dashboard/discounts");
  return { ok: true };
}
