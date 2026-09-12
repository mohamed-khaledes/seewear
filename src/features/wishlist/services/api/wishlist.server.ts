import "server-only";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { ProductListItem } from "@/features/products";

type WishlistRow = { product: ProductListItem | null };

/** Hearted products for the signed-in customer. RLS scopes it to them. */
export async function getWishlistProducts(): Promise<ProductListItem[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("wishlist_items")
    .select(
      `product:products(
        id, slug, name, description, category_id, price_cents, compare_at_cents,
        status, featured, on_sale, created_at,
        category:categories(id, slug, name),
        images:product_images(url, alt, position),
        variants:product_variants(id, color, color_hex, size, stock, price_cents)
      )`,
    )
    .order("created_at", { ascending: false })
    .returns<WishlistRow[]>();

  if (error) throw error;

  return (data ?? [])
    .map((row) => row.product)
    .filter((product): product is ProductListItem => product !== null)
    .map((product) => ({
      ...product,
      images: [...product.images].sort((a, b) => a.position - b.position),
    }));
}
