"use client";

import { useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";

import {
  serializeProductFilters,
  toggleInList,
} from "@/features/products/services/utils/filters";
import type { ProductFilters } from "@/features/products";

/**
 * Filters live in the URL so a result set is shareable. Every change resets to
 * page 1 and replaces the history entry — the back button should leave the
 * listing, not walk through filter states.
 */
export function useFilterNavigation(filters: ProductFilters) {
  const router = useRouter();
  const pathname = usePathname();

  const apply = useCallback(
    (patch: Partial<ProductFilters>) => {
      const next = { ...filters, ...patch, page: 1 };
      const query = serializeProductFilters(next);
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [filters, pathname, router],
  );

  const toggleColor = useCallback(
    (color: string) => apply({ colors: toggleInList(filters.colors, color) }),
    [apply, filters.colors],
  );

  const toggleSize = useCallback(
    (size: string) => apply({ sizes: toggleInList(filters.sizes, size) }),
    [apply, filters.sizes],
  );

  const setCategory = useCallback(
    (category: string) =>
      apply({ category: filters.category === category ? "" : category }),
    [apply, filters.category],
  );

  const clearAll = useCallback(() => {
    const query = serializeProductFilters({
      ...filters,
      q: filters.q,
      category: "",
      colors: [],
      sizes: [],
      minCents: null,
      maxCents: null,
      onSale: false,
      inStock: false,
      page: 1,
    });
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [filters, pathname, router]);

  return { apply, toggleColor, toggleSize, setCategory, clearAll };
}
