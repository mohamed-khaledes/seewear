import {
  FREE_SHIPPING_THRESHOLD_CENTS,
  SHIPPING_FLAT_CENTS,
  TAX_RATE,
} from "@/config/constants";
import type { CartTotals } from "@/features/cart/types";

type Priceable = { priceCents: number; quantity: number };

export function cartItemCount(items: Priceable[]): number {
  return items.reduce((count, item) => count + item.quantity, 0);
}

export function cartSubtotalCents(items: Priceable[]): number {
  return items.reduce((total, item) => total + item.priceCents * item.quantity, 0);
}

export function shippingCentsFor(subtotalCents: number): number {
  if (subtotalCents === 0) return 0;
  return subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS ? 0 : SHIPPING_FLAT_CENTS;
}

export function taxCentsFor(taxableCents: number): number {
  return Math.round(Math.max(taxableCents, 0) * TAX_RATE);
}

/**
 * The single definition of what an order costs. The checkout route runs this
 * again with prices read from the database — the browser's numbers are only
 * ever used to render.
 */
export function computeTotals(
  items: Priceable[],
  discountCents = 0,
): CartTotals {
  const subtotalCents = cartSubtotalCents(items);
  const cappedDiscount = Math.min(Math.max(discountCents, 0), subtotalCents);
  const shippingCents = shippingCentsFor(subtotalCents);
  const taxCents = taxCentsFor(subtotalCents - cappedDiscount);

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
export function amountToFreeShipping(subtotalCents: number): number {
  return Math.max(FREE_SHIPPING_THRESHOLD_CENTS - subtotalCents, 0);
}
