"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/react-query";
import {
  fetchCatalogFacetsFromBrowser,
  fetchCategoriesFromBrowser,
  fetchProductsFromBrowser,
} from "@/features/products/services/api/products.client";
import type { ProductFilters, ProductPage } from "@/features/products/types";

/**
 * Paged listing. The server renders page 1 and hands it in as `initialPage`, so
 * the first paint needs no client fetch and the URL stays shareable.
 */
export function useProductsInfinite(
  filters: ProductFilters,
  initialPage?: ProductPage,
) {
  return useInfiniteQuery({
    queryKey: queryKeys.products.list({ ...filters, page: 1 }),
    queryFn: ({ pageParam }) =>
      fetchProductsFromBrowser({ ...filters, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
    initialData: initialPage
      ? { pages: [initialPage], pageParams: [1] }
      : undefined,
  });
}

export function useCatalogFacets() {
  return useQuery({
    queryKey: queryKeys.facets.list(),
    queryFn: fetchCatalogFacetsFromBrowser,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories.list(),
    queryFn: fetchCategoriesFromBrowser,
    staleTime: 5 * 60 * 1000,
  });
}
