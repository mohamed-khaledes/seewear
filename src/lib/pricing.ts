import {
  FREE_SHIPPING_THRESHOLD_CENTS,
  SHIPPING_FLAT_CENTS,
  TAX_RATE,
} from "@/config/constants";

/**
 * Everything that decides what an order costs beyond the price of the pieces.
 *
 * Read from `store_settings` and `shipping_rates` on the server, handed to the
 * browser for display, and read again on the server at checkout — so the
 * dashboard's Settings page is the one place these numbers change. The
 * constants in `config/` are only the fallback for a database that is not
 * there yet.
 */
export type PricingRules = {
  shippingFlatCents: number;
  freeShippingThresholdCents: number;
  /** A rate, not a percentage: 0.14 is 14%. */
  taxRate: number;
  /** Governorates that cost something other than the flat rate. */
  governorateRates: Record<string, number>;
  codEnabled: boolean;
};

export const DEFAULT_PRICING_RULES: PricingRules = {
  shippingFlatCents: SHIPPING_FLAT_CENTS,
  freeShippingThresholdCents: FREE_SHIPPING_THRESHOLD_CENTS,
  taxRate: TAX_RATE,
  governorateRates: {},
  codEnabled: true,
};

/**
 * Shipping for one bag. Free over the threshold wherever it goes; otherwise the
 * governorate's own rate, or the flat rate when it has none. With no
 * governorate yet — the cart, before an address exists — the flat rate is the
 * honest estimate.
 */
export function shippingCentsFor(
  subtotalCents: number,
  rules: PricingRules = DEFAULT_PRICING_RULES,
  governorate?: string | null,
): number {
  if (subtotalCents <= 0) return 0;
  if (subtotalCents >= rules.freeShippingThresholdCents) return 0;
  if (governorate && governorate in rules.governorateRates) {
    return rules.governorateRates[governorate];
  }
  return rules.shippingFlatCents;
}

export function taxCentsFor(
  taxableCents: number,
  rules: PricingRules = DEFAULT_PRICING_RULES,
): number {
  return Math.round(Math.max(taxableCents, 0) * rules.taxRate);
}

/** True when the rate a bag pays depends on where it is going. */
export function hasRegionalRates(rules: PricingRules): boolean {
  return Object.values(rules.governorateRates).some(
    (rate) => rate !== rules.shippingFlatCents,
  );
}

/** "14%", for labels. Rounded to at most two decimals so 0.1425 reads 14.25%. */
export function formatTaxRate(rules: PricingRules): string {
  return `${Number((rules.taxRate * 100).toFixed(2))}%`;
}
