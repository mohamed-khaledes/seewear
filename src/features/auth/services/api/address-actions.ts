"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "./session.server";
import { addressSchema, type AddressValues } from "@/features/auth/types";

export type AddressResult = { ok: true } | { ok: false; error: string };

function revalidateAddresses() {
  revalidatePath("/account");
  revalidatePath("/account/addresses");
  revalidatePath("/checkout");
}

/**
 * Adds or edits one address. Every write runs as the customer, so RLS is what
 * keeps one person's address book out of another's — the checks here are for
 * friendlier errors, not for safety.
 */
export async function saveAddressAction(
  values: AddressValues,
  id?: string,
): Promise<AddressResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in to keep addresses." };

  const parsed = addressSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  const supabase = await createClient();

  // Only one default per person; the partial unique index enforces it, so the
  // old default has to step down first.
  if (parsed.data.isDefault) {
    await supabase
      .from("addresses")
      .update({ is_default: false })
      .eq("user_id", user.id)
      .eq("is_default", true);
  }

  const row = {
    label: parsed.data.label || null,
    full_name: parsed.data.fullName,
    phone: parsed.data.phone,
    line1: parsed.data.line1,
    line2: parsed.data.line2 || null,
    city: parsed.data.city,
    governorate: parsed.data.governorate,
    postal_code: parsed.data.postalCode || null,
    is_default: parsed.data.isDefault,
  };

  const { error } = id
    ? await supabase.from("addresses").update(row).eq("id", id)
    : await supabase.from("addresses").insert({ ...row, user_id: user.id });

  if (error) return { ok: false, error: "We could not save that address." };

  revalidateAddresses();
  return { ok: true };
}

export async function deleteAddressAction(id: string): Promise<AddressResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in first." };

  const supabase = await createClient();
  const { error } = await supabase.from("addresses").delete().eq("id", id);
  if (error) return { ok: false, error: "We could not remove that address." };

  revalidateAddresses();
  return { ok: true };
}

export async function makeDefaultAddressAction(id: string): Promise<AddressResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in first." };

  const supabase = await createClient();
  await supabase
    .from("addresses")
    .update({ is_default: false })
    .eq("user_id", user.id)
    .eq("is_default", true);

  const { error } = await supabase.from("addresses").update({ is_default: true }).eq("id", id);
  if (error) return { ok: false, error: "We could not change the default." };

  revalidateAddresses();
  return { ok: true };
}
