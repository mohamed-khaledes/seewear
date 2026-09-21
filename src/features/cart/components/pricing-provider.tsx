"use client";

import { createContext, useContext } from "react";

import { DEFAULT_PRICING_RULES, type PricingRules } from "@/lib/pricing";

const PricingRulesContext = createContext<PricingRules>(DEFAULT_PRICING_RULES);

/**
 * Hands the store's live pricing rules to the browser, so the bag, the drawer,
 * the product page and the checkout summary all show what the server will
 * actually charge. Read once per request in the shop layout.
 */
export function PricingRulesProvider({
  rules,
  children,
}: {
  rules: PricingRules;
  children: React.ReactNode;
}) {
  return (
    <PricingRulesContext.Provider value={rules}>{children}</PricingRulesContext.Provider>
  );
}

export function usePricingRules(): PricingRules {
  return useContext(PricingRulesContext);
}
