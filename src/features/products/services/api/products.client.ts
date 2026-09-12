"use client";

import { createClient } from "@/lib/supabase/client";
import type { ProductFilters, ProductListItem, ProductPage } from "@/features/products/types";

import * as queries from "./product-queries";

export function fetchProductsFromBrowser(filters: ProductFilters): Promise<ProductPage> {
  return queries.fetchProducts(createClient(), filters);
}

export function fetchCatalogFacetsFromBrowser() {
  return queries.fetchCatalogFacets(createClient());
}

export function fetchCategoriesFromBrowser() {
  return queries.fetchCategories(createClient());
}

export function searchProductsFromBrowser(
  term: string,
  limit = 6,
): Promise<ProductListItem[]> {
  return queries.searchProducts(createClient(), term, limit);
}
