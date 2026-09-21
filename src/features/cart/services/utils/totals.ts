import {
  DEFAULT_PRICING_RULES,
  shippingCentsFor,
  taxCentsFor,
  type PricingRules,
} from "@/lib/pricing";
import type { CartTotals } from "@/features/cart/types";

export { shippingCentsFor, taxCentsFor };

type Priceable = { priceCents: number; quantity: number };

export function cartItemCount(items: Priceable[]): number {
  return items.reduce((count, item) => count + item.quantity, 0);
}

export function cartSubtotalCents(items: Priceable[]): number {
  return items.reduce((total, item) => total + item.priceCents * item.quantity, 0);
}

/**
 * The single definition of what an order costs. The checkout route runs this
 * again with prices read from the database and rules read from the store
 * settings — the browser's numbers are only ever used to render.
 *
 * VAT is charged on the discounted subtotal; the free-shipping threshold is
 * judged on the subtotal before the discount. The shipping help page states
 * both, and reads them from the same rules.
 */
export function computeTotals(
  items: Priceable[],
  discountCents = 0,
  rules: PricingRules = DEFAULT_PRICING_RULES,
  governorate?: string | null,
): CartTotals {
  const subtotalCents = cartSubtotalCents(items);
  const cappedDiscount = Math.min(Math.max(discountCents, 0), subtotalCents);
  const shippingCents = shippingCentsFor(subtotalCents, rules, governorate);
  const taxCents = taxCentsFor(subtotalCents - cappedDiscount, rules);

  return {
    subtotalCents,
    discountCents: cappedDiscount,
    shippingCents,
    taxCents,
    totalCents: subtotalCents - cappedDiscount + shippingCents + taxCents,
    itemCount: cartItemCount(items),
  };
}

/** How much more the customer needs to spend to unlock free shipping. */
export function amountToFreeShipping(
  subtotalCents: number,
  rules: PricingRules = DEFAULT_PRICING_RULES,
): number {
  return Math.max(rules.freeShippingThresholdCents - subtotalCents, 0);
}
