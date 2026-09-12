"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { toPiastres } from "@/lib/utils";
import { assertCanManageStore } from "./guards.server";
import {
  discountFormSchema,
  storeSettingsFormSchema,
  type ActionResult,
  type DiscountFormValues,
  type StoreSettingsFormValues,
} from "@/features/dashboard/types";

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
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  if (error) return { ok: false, error: "We could not save those settings." };

  revalidatePath("/dashboard/settings");
  revalidatePath("/", "layout");
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
