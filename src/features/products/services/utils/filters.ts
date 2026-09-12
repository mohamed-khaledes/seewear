import { PRODUCTS_PER_PAGE } from "@/config/constants";
import {
  defaultProductFilters,
  productFiltersSchema,
  SORT_VALUES,
  type ProductFilters,
  type ProductSort,
} from "@/features/products/types";

export type RawSearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function list(value: string | string[] | undefined): string[] {
  if (!value) return [];
  const values = Array.isArray(value) ? value : value.split(",");
  return values.map((item) => item.trim()).filter(Boolean);
}

function money(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

/** URL query string → validated filters. Anything unparseable falls back. */
export function parseProductFilters(params: RawSearchParams): ProductFilters {
  const sortParam = first(params.sort);
  const sort: ProductSort = (SORT_VALUES as readonly string[]).includes(sortParam ?? "")
    ? (sortParam as ProductSort)
    : "newest";

  const page = Number.parseInt(first(params.page) ?? "1", 10);

  const result = productFiltersSchema.safeParse({
    q: first(params.q) ?? "",
    category: first(params.category) ?? "",
    colors: list(params.color ?? params.colors),
    sizes: list(params.size ?? params.sizes),
    minCents: money(first(params.min)),
    maxCents: money(first(params.max)),
    onSale: first(params.sale) === "1",
    inStock: first(params.stock) === "1",
    sort,
    page: Number.isFinite(page) && page > 0 ? page : 1,
    perPage: PRODUCTS_PER_PAGE,
  });

  return result.success ? result.data : defaultProductFilters;
}

/** Filters → a shareable query string. Defaults are left out. */
export function serializeProductFilters(filters: ProductFilters): string {
  const params = new URLSearchParams();

  if (filters.q) params.set("q", filters.q);
  if (filters.category) params.set("category", filters.category);
  if (filters.colors.length) params.set("color", filters.colors.join(","));
  if (filters.sizes.length) params.set("size", filters.sizes.join(","));
  if (filters.minCents !== null) params.set("min", String(filters.minCents));
  if (filters.maxCents !== null) params.set("max", String(filters.maxCents));
  if (filters.onSale) params.set("sale", "1");
  if (filters.inStock) params.set("stock", "1");
  if (filters.sort !== "newest") params.set("sort", filters.sort);
  if (filters.page > 1) params.set("page", String(filters.page));

  return params.toString();
}

export function productsHref(filters: ProductFilters): string {
  const query = serializeProductFilters(filters);
  return query ? `/products?${query}` : "/products";
}

export function activeFilterCount(filters: ProductFilters): number {
  return (
    filters.colors.length +
    filters.sizes.length +
    (filters.category ? 1 : 0) +
    (filters.onSale ? 1 : 0) +
    (filters.inStock ? 1 : 0) +
    (filters.minCents !== null || filters.maxCents !== null ? 1 : 0)
  );
}

export function toggleInList(values: string[], value: string): string[] {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}
