import { describe, expect, it } from "vitest";

import {
  DEFAULT_PRICING_RULES,
  formatTaxRate,
  hasRegionalRates,
  shippingCentsFor,
  type PricingRules,
} from "@/lib/pricing";
import { amountToFreeShipping, computeTotals } from "@/features/cart/services/utils/totals";

const rules: PricingRules = {
  shippingFlatCents: 8_000,
  freeShippingThresholdCents: 400_000,
  taxRate: 0.14,
  governorateRates: { Aswan: 15_000, Giza: 8_000 },
  codEnabled: true,
};

const bag = (priceCents: number, quantity = 1) => [{ priceCents, quantity }];

describe("shipping", () => {
  it("charges the flat rate when no governorate is known yet", () => {
    expect(shippingCentsFor(100_000, rules)).toBe(8_000);
  });

  it("charges a governorate its own rate", () => {
    expect(shippingCentsFor(100_000, rules, "Aswan")).toBe(15_000);
  });

  it("falls back to the flat rate for a governorate without one", () => {
    expect(shippingCentsFor(100_000, rules, "Cairo")).toBe(8_000);
  });

  it("is free at the threshold everywhere, including expensive governorates", () => {
    expect(shippingCentsFor(400_000, rules, "Aswan")).toBe(0);
  });

  it("costs nothing for an empty bag", () => {
    expect(shippingCentsFor(0, rules, "Aswan")).toBe(0);
  });

  it("only counts a regional rate that differs from the flat one", () => {
    expect(hasRegionalRates(rules)).toBe(true);
    expect(hasRegionalRates({ ...rules, governorateRates: { Giza: 8_000 } })).toBe(false);
  });
});

describe("computeTotals", () => {
  it("adds shipping and VAT to the subtotal", () => {
    const totals = computeTotals(bag(100_000), 0, rules, "Cairo");
    expect(totals).toMatchObject({
      subtotalCents: 100_000,
      shippingCents: 8_000,
      taxCents: 14_000,
      totalCents: 122_000,
    });
  });

  it("charges VAT on the subtotal after the discount", () => {
    const totals = computeTotals(bag(100_000), 20_000, rules);
    expect(totals.taxCents).toBe(11_200);
    expect(totals.totalCents).toBe(100_000 - 20_000 + 8_000 + 11_200);
  });

  it("judges free shipping before the discount, so a code never costs free delivery", () => {
    const totals = computeTotals(bag(400_000), 50_000, rules, "Aswan");
    expect(totals.shippingCents).toBe(0);
  });

  it("never lets a discount take the subtotal below zero", () => {
    const totals = computeTotals(bag(10_000), 999_999, rules);
    expect(totals.discountCents).toBe(10_000);
    expect(totals.taxCents).toBe(0);
    expect(totals.totalCents).toBe(8_000);
  });

  it("rounds VAT to whole piastres", () => {
    expect(computeTotals(bag(333), 0, rules).taxCents).toBe(47);
  });

  it("uses the rules it is given, not the constants", () => {
    const cheap = { ...rules, taxRate: 0.1, shippingFlatCents: 5_000 };
    const totals = computeTotals(bag(100_000), 0, cheap);
    expect(totals.taxCents).toBe(10_000);
    expect(totals.shippingCents).toBe(5_000);
  });

  it("counts items across lines", () => {
    const totals = computeTotals(
      [
        { priceCents: 1_000, quantity: 2 },
        { priceCents: 500, quantity: 3 },
      ],
      0,
      rules,
    );
    expect(totals.itemCount).toBe(5);
    expect(totals.subtotalCents).toBe(3_500);
  });
});

describe("labels", () => {
  it("formats the VAT rate without float noise", () => {
    expect(formatTaxRate({ ...DEFAULT_PRICING_RULES, taxRate: 0.14 })).toBe("14%");
    expect(formatTaxRate({ ...DEFAULT_PRICING_RULES, taxRate: 0.1425 })).toBe("14.25%");
  });

  it("says how far a bag is from free shipping", () => {
    expect(amountToFreeShipping(350_000, rules)).toBe(50_000);
    expect(amountToFreeShipping(500_000, rules)).toBe(0);
  });
});
