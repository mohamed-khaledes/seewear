import { z } from "zod";

import { PRODUCTS_PER_PAGE } from "@/config/constants";
import type { Tables } from "@/types/database.types";

export type ProductRow = Tables<"products">;
export type ProductImageRow = Tables<"product_images">;
export type ProductVariantRow = Tables<"product_variants">;
export type CategoryRow = Tables<"categories">;

export type ProductCategory = Pick<CategoryRow, "id" | "slug" | "name">;

/** What a product card needs: one shot, price, and enough variant data for swatches. */
export type ProductListItem = ProductRow & {
  category: ProductCategory | null;
  images: Pick<ProductImageRow, "url" | "alt" | "position">[];
  variants: Pick<
    ProductVariantRow,
    "id" | "color" | "color_hex" | "size" | "stock" | "price_cents"
  >[];
};

/** The full product page: every image, every variant. */
export type ProductDetail = ProductRow & {
  category: ProductCategory | null;
  images: ProductImageRow[];
  variants: ProductVariantRow[];
};

export type ProductPage = {
  items: ProductListItem[];
  total: number;
  page: number;
  perPage: number;
  hasMore: boolean;
};

/** Colour and size options across the live catalogue, for the filter rail. */
export type CatalogFacets = {
  colors: { name: string; hex: string | null; count: number }[];
  sizes: { name: string; count: number }[];
  priceRange: { minCents: number; maxCents: number };
};

export const SORT_VALUES = ["newest", "price-asc", "price-desc"] as const;
export type ProductSort = (typeof SORT_VALUES)[number];

export const productFiltersSchema = z.object({
  q: z.string().trim().default(""),
  category: z.string().trim().default(""),
  colors: z.array(z.string()).default([]),
  sizes: z.array(z.string()).default([]),
  minCents: z.number().int().nonnegative().nullable().default(null),
  maxCents: z.number().int().nonnegative().nullable().default(null),
  onSale: z.boolean().default(false),
  inStock: z.boolean().default(false),
  sort: z.enum(SORT_VALUES).default("newest"),
  page: z.number().int().min(1).default(1),
  perPage: z.number().int().min(1).max(48).default(PRODUCTS_PER_PAGE),
});

export type ProductFilters = z.infer<typeof productFiltersSchema>;

export const defaultProductFilters: ProductFilters = productFiltersSchema.parse({});

/** A colour, with the variants that carry it and whether any are in stock. */
export type ColorOption = {
  name: string;
  hex: string | null;
  imageUrl: string | null;
  inStock: boolean;
};

export type SizeOption = {
  name: string;
  stock: number;
  variantId: string | null;
};
