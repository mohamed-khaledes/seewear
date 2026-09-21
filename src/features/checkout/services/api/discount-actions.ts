"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { isServiceRoleConfigured } from "@/lib/supabase/config";
import { allowByAddress, RATE_LIMITED_MESSAGE } from "@/lib/rate-limit";
import { loadPricingRules } from "@/lib/store-settings";
import { getSessionUser } from "@/features/auth/server";
import { cartInputSchema, type CartLineInput } from "@/features/cart/types";
import { repriceCart, CheckoutError } from "./pricing.server";
import type { DiscountPreview } from "@/features/checkout/types";

export type DiscountResult =
  | { ok: true; discount: DiscountPreview }
  | { ok: false; error: string };

/**
 * Checks a discount code against the database and prices it against the real
 * cart. The browser never decides what a code is worth.
 *
 * Rate limited, because without a limit this is a free oracle for guessing
 * codes: every wrong answer comes back in milliseconds.
 */
export async function previewDiscount(
  code: string,
  items: CartLineInput[],
  email?: string,
): Promise<DiscountResult> {
  const trimmed = code.trim();
  if (!trimmed) return { ok: false, error: "Enter a code first." };

  if (!isServiceRoleConfigured()) {
    return { ok: false, error: "Discounts are not available on this deployment." };
  }

  if (!(await allowByAddress("discountPreview"))) {
    return { ok: false, error: RATE_LIMITED_MESSAGE };
  }

  const parsedItems = cartInputSchema.safeParse(items);
  if (!parsedItems.success) {
    return { ok: false, error: "Your bag is empty." };
  }

  try {
    const admin = createAdminClient();
    const [rules, user] = await Promise.all([loadPricingRules(admin), getSessionUser()]);
    const priced = await repriceCart(admin, parsedItems.data, trimmed, {
      rules,
      email: email?.includes("@") ? email : (user?.email ?? null),
      userId: user?.id ?? null,
    });

    if (!priced.discount) {
      return { ok: false, error: priced.discountRejection ?? "That code is not valid." };
    }

    return {
      ok: true,
      discount: {
        code: priced.discount.code,
        discountCents: priced.discount.cents,
        label: `Code ${priced.discount.code} applied`,
      },
    };
  } catch (error) {
    if (error instanceof CheckoutError) {
      return { ok: false, error: error.message };
    }
    console.error("[checkout] discount preview failed", error);
    return { ok: false, error: "We could not check that code just now." };
  }
}
