import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";
import type {
  CatalogFacets,
  ProductCategory,
  ProductDetail,
  ProductFilters,
  ProductListItem,
  ProductPage,
} from "@/features/products/types";

/** Works with the browser client, the server client or the service-role client. */
export type Db = SupabaseClient<Database>;

const LIST_COLUMNS = `
  id, slug, name, description, category_id, price_cents, compare_at_cents,
  status, featured, on_sale, created_at,
  category:categories(id, slug, name),
  images:product_images(url, alt, position),
  variants:product_variants(id, color, color_hex, size, stock, price_cents)
`;

const DETAIL_COLUMNS = `
  id, slug, name, description, category_id, price_cents, compare_at_cents,
  status, featured, on_sale, created_at,
  category:categories(id, slug, name),
  images:product_images(id, product_id, url, alt, position),
  variants:product_variants(id, product_id, color, color_hex, size, sku, stock, price_cents)
`;

function sortImages<T extends { position: number }>(images: T[]): T[] {
  return [...images].sort((a, b) => a.position - b.position);
}

/**
 * Colour, size and stock filters need a pre-pass over variants: filtering them
 * inside the main select would also trim the variants we render swatches from.
 */
async function productIdsMatchingVariants(
  db: Db,
  filters: ProductFilters,
): Promise<string[] | null> {
  const needsVariantFilter =
    filters.colors.length > 0 || filters.sizes.length > 0 || filters.inStock;

  if (!needsVariantFilter) return null;

  let query = db.from("product_variants").select("product_id");

  if (filters.colors.length > 0) query = query.in("color", filters.colors);
  if (filters.sizes.length > 0) query = query.in("size", filters.sizes);
  if (filters.inStock) query = query.gt("stock", 0);

  const { data, error } = await query.limit(2000);
  if (error) throw error;

  return [...new Set(data.map((row) => row.product_id))];
}

export async function fetchProducts(
  db: Db,
  filters: ProductFilters,
): Promise<ProductPage> {
  const variantIds = await productIdsMatchingVariants(db, filters);

  if (variantIds !== null && variantIds.length === 0) {
    return {
      items: [],
      total: 0,
      page: filters.page,
      perPage: filters.perPage,
      hasMore: false,
    };
  }

  // An inner join on categories would drop uncategorised products, so it is
  // only used when the customer actually filtered by category.
  const columns = filters.category
    ? LIST_COLUMNS.replace("category:categories(", "category:categories!inner(")
    : LIST_COLUMNS;

  let query = db
    .from("products")
    .select(columns, { count: "exact" })
    .eq("status", "active");

  if (filters.category) query = query.eq("category.slug", filters.category);
  if (filters.q) query = query.ilike("name", `%${filters.q}%`);
  if (filters.onSale) query = query.eq("on_sale", true);
  if (filters.minCents !== null) query = query.gte("price_cents", filters.minCents);
  if (filters.maxCents !== null) query = query.lte("price_cents", filters.maxCents);
  if (variantIds !== null) query = query.in("id", variantIds);

  switch (filters.sort) {
    case "price-asc":
      query = query.order("price_cents", { ascending: true });
      break;
    case "price-desc":
      query = query.order("price_cents", { ascending: false });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }
  query = query.order("id", { ascending: true });

  const from = (filters.page - 1) * filters.perPage;
  const { data, error, count } = await query
    .range(from, from + filters.perPage - 1)
    .returns<ProductListItem[]>();

  if (error) throw error;

  const items = (data ?? []).map((item) => ({
    ...item,
    images: sortImages(item.images),
  }));
  const total = count ?? items.length;

  return {
    items,
    total,
    page: filters.page,
    perPage: filters.perPage,
    hasMore: from + items.length < total,
  };
}

export async function fetchFeaturedProducts(
  db: Db,
  limit = 10,
): Promise<ProductListItem[]> {
  const { data, error } = await db
    .from("products")
    .select(LIST_COLUMNS)
    .eq("status", "active")
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<ProductListItem[]>();

  if (error) throw error;

  return (data ?? []).map((item) => ({ ...item, images: sortImages(item.images) }));
}

export async function fetchProductBySlug(
  db: Db,
  slug: string,
): Promise<ProductDetail | null> {
  const { data, error } = await db
    .from("products")
    .select(DETAIL_COLUMNS)
    .eq("slug", slug)
    .maybeSingle<ProductDetail>();

  if (error) throw error;
  if (!data) return null;

  return { ...data, images: sortImages(data.images) };
}

export async function fetchRelatedProducts(
  db: Db,
  product: Pick<ProductDetail, "id" | "category_id">,
  limit = 5,
): Promise<ProductListItem[]> {
  const pick = async (categoryId: string | null, exclude: string[]) => {
    let query = db
      .from("products")
      .select(LIST_COLUMNS)
      .eq("status", "active")
      .not("id", "in", `(${exclude.join(",")})`);

    if (categoryId) query = query.eq("category_id", categoryId);

    const { data, error } = await query
      .order("featured", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit)
      .returns<ProductListItem[]>();

    if (error) throw error;
    return data ?? [];
  };

  const sameCategory = await pick(product.category_id, [product.id]);

  // A product alone in its category would otherwise show nothing at all, so top
  // the rail up from the wider catalogue.
  const results =
    sameCategory.length >= limit
      ? sameCategory
      : [
          ...sameCategory,
          ...(await pick(null, [product.id, ...sameCategory.map((item) => item.id)])),
        ].slice(0, limit);

  return results.map((item) => ({ ...item, images: sortImages(item.images) }));
}

export async function fetchCategories(db: Db): Promise<ProductCategory[]> {
  const { data, error } = await db
    .from("categories")
    .select("id, slug, name")
    .order("position");

  if (error) throw error;
  return data ?? [];
}

/** Colours, sizes and the live price range across the active catalogue. */
export async function fetchCatalogFacets(db: Db): Promise<CatalogFacets> {
  const [variantsResult, priceResult] = await Promise.all([
    db
      .from("product_variants")
      .select("color, color_hex, size, stock, products!inner(status)")
      .eq("products.status", "active")
      .limit(2000)
      .returns<
        {
          color: string | null;
          color_hex: string | null;
          size: string | null;
          stock: number;
        }[]
      >(),
    db
      .from("products")
      .select("price_cents")
      .eq("status", "active")
      .order("price_cents", { ascending: true }),
  ]);

  if (variantsResult.error) throw variantsResult.error;
  if (priceResult.error) throw priceResult.error;

  const colors = new Map<string, { name: string; hex: string | null; count: number }>();
  const sizes = new Map<string, { name: string; count: number }>();

  for (const variant of variantsResult.data ?? []) {
    if (variant.color) {
      const entry = colors.get(variant.color) ?? {
        name: variant.color,
        hex: variant.color_hex,
        count: 0,
      };
      entry.count += 1;
      entry.hex ??= variant.color_hex;
      colors.set(variant.color, entry);
    }
    if (variant.size) {
      const entry = sizes.get(variant.size) ?? { name: variant.size, count: 0 };
      entry.count += 1;
      sizes.set(variant.size, entry);
    }
  }

  const prices = (priceResult.data ?? []).map((row) => row.price_cents);

  const sizeOrder = ["XS", "S", "M", "L", "XL", "XXL", "One Size"];

  return {
    colors: [...colors.values()].sort((a, b) => a.name.localeCompare(b.name)),
    sizes: [...sizes.values()].sort((a, b) => {
      const ai = sizeOrder.indexOf(a.name);
      const bi = sizeOrder.indexOf(b.name);
      if (ai === -1 && bi === -1) return a.name.localeCompare(b.name);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    }),
    priceRange: {
      minCents: prices[0] ?? 0,
      maxCents: prices[prices.length - 1] ?? 0,
    },
  };
}

/** Type-ahead for the header search dialog. */
export async function searchProducts(
  db: Db,
  term: string,
  limit = 6,
): Promise<ProductListItem[]> {
  const trimmed = term.trim();
  if (trimmed.length < 2) return [];

  const { data, error } = await db
    .from("products")
    .select(LIST_COLUMNS)
    .eq("status", "active")
    .ilike("name", `%${trimmed}%`)
    .limit(limit)
    .returns<ProductListItem[]>();

  if (error) throw error;

  return (data ?? []).map((item) => ({ ...item, images: sortImages(item.images) }));
}
