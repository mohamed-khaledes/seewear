"use client";

import { createClient } from "@/lib/supabase/client";
import type { CartLine } from "@/features/cart/types";

type ServerCartRow = {
  quantity: number;
  variant: {
    id: string;
    color: string | null;
    color_hex: string | null;
    size: string | null;
    stock: number;
    price_cents: number | null;
    product: {
      id: string;
      slug: string;
      name: string;
      price_cents: number;
      compare_at_cents: number | null;
      images: { url: string; position: number }[];
    } | null;
  } | null;
};

const CART_SELECT = `
  quantity,
  variant:product_variants(
    id, color, color_hex, size, stock, price_cents,
    product:products(
      id, slug, name, price_cents, compare_at_cents,
      images:product_images(url, position)
    )
  )
`;

/** The signed-in user's cart, as bag lines. RLS scopes this to them. */
export async function fetchServerCart(): Promise<CartLine[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("cart_items")
    .select(CART_SELECT)
    .returns<ServerCartRow[]>();

  if (error) throw error;

  return (data ?? []).flatMap((row) => {
    const variant = row.variant;
    const product = variant?.product;
    if (!variant || !product) return [];

    const image = [...product.images].sort((a, b) => a.position - b.position)[0];

    return [
      {
        variantId: variant.id,
        productId: product.id,
        slug: product.slug,
        name: product.name,
        color: variant.color,
        colorHex: variant.color_hex,
        size: variant.size,
        priceCents: variant.price_cents ?? product.price_cents,
        compareAtCents: product.compare_at_cents,
        imageUrl: image?.url ?? null,
        quantity: Math.min(row.quantity, Math.max(variant.stock, 1)),
        maxStock: variant.stock,
      } satisfies CartLine,
    ];
  });
}

function toPayload(lines: CartLine[]) {
  return lines.map((line) => ({
    variant_id: line.variantId,
    quantity: line.quantity,
  }));
}

/** Union the guest cart into the DB cart — quantities summed, capped at stock. */
export async function mergeGuestCart(lines: CartLine[]): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("merge_guest_cart", {
    p_items: toPayload(lines),
  });
  if (error) throw error;
}

/** Mirror the local cart into the DB so it follows the user between devices. */
export async function replaceServerCart(lines: CartLine[]): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("replace_cart", {
    p_items: toPayload(lines),
  });
  if (error) throw error;
}
