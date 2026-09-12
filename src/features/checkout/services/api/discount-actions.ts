"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { isServiceRoleConfigured } from "@/lib/supabase/config";
import { cartInputSchema, type CartLineInput } from "@/features/cart/types";
import { repriceCart, CheckoutError } from "./pricing.server";
import type { DiscountPreview } from "@/features/checkout/types";

export type DiscountResult =
  | { ok: true; discount: DiscountPreview }
  | { ok: false; error: string };

/**
 * Checks a discount code against the database and prices it against the real
 * cart. The browser never decides what a code is worth.
 */
export async function previewDiscount(
  code: string,
  items: CartLineInput[],
): Promise<DiscountResult> {
  const trimmed = code.trim();
  if (!trimmed) return { ok: false, error: "Enter a code first." };

  if (!isServiceRoleConfigured()) {
    return { ok: false, error: "Discounts are not available on this deployment." };
  }

  const parsedItems = cartInputSchema.safeParse(items);
  if (!parsedItems.success) {
    return { ok: false, error: "Your bag is empty." };
  }

  try {
    const priced = await repriceCart(createAdminClient(), parsedItems.data, trimmed);

    if (!priced.discount) {
      return { ok: false, error: "That code is not valid for this bag." };
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
