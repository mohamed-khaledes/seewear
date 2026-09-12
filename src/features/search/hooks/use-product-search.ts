"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/react-query";
import { searchProductsFromBrowser } from "@/features/products/services/api/products.client";

export function useDebouncedValue<T>(value: T, delay = 220): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

export function useProductSearch(term: string) {
  const debounced = useDebouncedValue(term);

  return useQuery({
    queryKey: [...queryKeys.products.all, "search", debounced],
    queryFn: () => searchProductsFromBrowser(debounced),
    enabled: debounced.trim().length >= 2,
    staleTime: 30_000,
  });
}
