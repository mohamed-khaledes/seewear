"use client";

import { useMemo } from "react";

import { useCartStore } from "@/features/cart/store/cart-store";
import { computeTotals } from "@/features/cart/services/utils/totals";
import { usePricingRules } from "@/features/cart/components/pricing-provider";

/**
 * Read the cart. `hydrated` is false during the first client render so nothing
 * that depends on localStorage is rendered on the server pass.
 */
export function useCart() {
  const items = useCartStore((state) => state.items);
  const hydrated = useCartStore((state) => state.hydrated);
  const addItem = useCartStore((state) => state.addItem);
  const setQuantity = useCartStore((state) => state.setQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const replaceItems = useCartStore((state) => state.replaceItems);
  const clear = useCartStore((state) => state.clear);

  const rules = usePricingRules();

  // No governorate yet, so shipping here is the flat-rate estimate. Checkout
  // re-prices once the address is known.
  const totals = useMemo(() => computeTotals(items, 0, rules), [items, rules]);

  return {
    items,
    hydrated,
    totals,
    rules,
    itemCount: totals.itemCount,
    addItem,
    setQuantity,
    removeItem,
    replaceItems,
    clear,
  };
}
