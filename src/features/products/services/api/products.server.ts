import "server-only";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type {
  CatalogFacets,
  ProductCategory,
  ProductDetail,
  ProductFilters,
  ProductListItem,
  ProductPage,
} from "@/features/products/types";

import * as queries from "./product-queries";

const emptyPage = (filters: ProductFilters): ProductPage => ({
  items: [],
  total: 0,
  page: filters.page,
  perPage: filters.perPage,
  hasMore: false,
});

export async function getProducts(filters: ProductFilters): Promise<ProductPage> {
  if (!isSupabaseConfigured()) return emptyPage(filters);
  const supabase = await createClient();
  return queries.fetchProducts(supabase, filters);
}

export async function getFeaturedProducts(limit = 10): Promise<ProductListItem[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  return queries.fetchFeaturedProducts(supabase, limit);
}

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  return queries.fetchProductBySlug(supabase, slug);
}

export async function getRelatedProducts(
  product: Pick<ProductDetail, "id" | "category_id">,
  limit = 5,
): Promise<ProductListItem[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  return queries.fetchRelatedProducts(supabase, product, limit);
}

export async function getCategories(): Promise<ProductCategory[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  return queries.fetchCategories(supabase);
}

export async function getCatalogFacets(): Promise<CatalogFacets> {
  if (!isSupabaseConfigured()) {
    return { colors: [], sizes: [], priceRange: { minCents: 0, maxCents: 0 } };
  }
  const supabase = await createClient();
  return queries.fetchCatalogFacets(supabase);
}

/** Every active slug, for the sitemap and static params. */
export async function getProductSlugs(): Promise<{ slug: string; created_at: string }[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("slug, created_at")
    .eq("status", "active");

  if (error) throw error;
  return data ?? [];
}
