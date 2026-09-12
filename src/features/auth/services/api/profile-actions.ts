"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { profileSchema, type ProfileValues } from "@/features/auth/types";

export type ProfileResult = { ok: true } | { ok: false; error: string };

/**
 * Updates the customer's own profile. `role` and `is_demo` are stripped by a
 * database trigger, so nothing here can escalate.
 */
export async function updateProfileAction(
  values: ProfileValues,
): Promise<ProfileResult> {
  const parsed = profileSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "You need to be signed in." };

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.fullName,
      phone: parsed.data.phone || null,
    })
    .eq("id", user.id);

  if (error) {
    return { ok: false, error: "We could not save that. Try again in a moment." };
  }

  revalidatePath("/account");
  return { ok: true };
}
