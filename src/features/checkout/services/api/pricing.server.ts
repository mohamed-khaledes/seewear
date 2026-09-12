import "server-only";

import type { SupabaseAdminClient } from "@/lib/supabase/admin";
import { computeTotals } from "@/features/cart/services/utils/totals";
import type { CartLineInput, CartTotals, PricedCartLine } from "@/features/cart/types";

export type RepricedCart = {
  lines: PricedCartLine[];
  totals: CartTotals;
  discount: { code: string; cents: number } | null;
};

export class CheckoutError extends Error {
  constructor(
    message: string,
    readonly unavailable?: { variantId: string; stock: number }[],
  ) {
    super(message);
    this.name = "CheckoutError";
  }
}

type VariantRow = {
  id: string;
  color: string | null;
  size: string | null;
  stock: number;
  price_cents: number | null;
  product: {
    id: string;
    slug: string;
    name: string;
    price_cents: number;
    status: string;
    images: { url: string; position: number }[];
  } | null;
};

/**
 * Rebuilds the cart from the database: every price, every stock level and the
 * discount are read server-side. The browser only ever says which variants and
 * how many.
 */
export async function repriceCart(
  admin: SupabaseAdminClient,
  items: CartLineInput[],
  discountCode?: string,
): Promise<RepricedCart> {
  const wanted = new Map<string, number>();
  for (const item of items) {
    wanted.set(item.variantId, (wanted.get(item.variantId) ?? 0) + item.quantity);
  }

  const { data, error } = await admin
    .from("product_variants")
    .select(
      `id, color, size, stock, price_cents,
       product:products(id, slug, name, price_cents, status,
         images:product_images(url, position))`,
    )
    .in("id", [...wanted.keys()])
    .returns<VariantRow[]>();

  if (error) throw error;

  const found = new Map(data.map((row) => [row.id, row]));
  const unavailable: { variantId: string; stock: number }[] = [];
  const lines: PricedCartLine[] = [];

  for (const [variantId, quantity] of wanted) {
    const variant = found.get(variantId);

    if (!variant || !variant.product || variant.product.status !== "active") {
      unavailable.push({ variantId, stock: 0 });
      continue;
    }

    if (variant.stock < quantity) {
      unavailable.push({ variantId, stock: variant.stock });
      continue;
    }

    const image = [...variant.product.images].sort(
      (a, b) => a.position - b.position,
    )[0];

    lines.push({
      variantId: variant.id,
      productId: variant.product.id,
      name: variant.product.name,
      slug: variant.product.slug,
      color: variant.color,
      size: variant.size,
      imageUrl: image?.url ?? null,
      priceCents: variant.price_cents ?? variant.product.price_cents,
      quantity,
      stock: variant.stock,
    });
  }

  if (unavailable.length > 0) {
    throw new CheckoutError(
      "Some pieces sold out while you were deciding. Update your bag and try again.",
      unavailable,
    );
  }

  if (lines.length === 0) {
    throw new CheckoutError("Your bag is empty.");
  }

  const discount = discountCode
    ? await resolveDiscount(admin, discountCode, sumSubtotal(lines))
    : null;

  return {
    lines,
    totals: computeTotals(lines, discount?.cents ?? 0),
    discount,
  };
}

function sumSubtotal(lines: PricedCartLine[]): number {
  return lines.reduce((total, line) => total + line.priceCents * line.quantity, 0);
}

/** Validates a discount code against the database. Unknown codes are ignored. */
export async function resolveDiscount(
  admin: SupabaseAdminClient,
  code: string,
  subtotalCents: number,
): Promise<{ code: string; cents: number } | null> {
  const trimmed = code.trim();
  if (!trimmed) return null;

  const { data, error } = await admin
    .from("discount_codes")
    .select("code, percent_off, amount_off_cents, min_subtotal_cents, active, expires_at")
    .eq("code", trimmed)
    .maybeSingle();

  if (error || !data) return null;
  if (!data.active) return null;
  if (data.expires_at && new Date(data.expires_at) < new Date()) return null;
  if (subtotalCents < data.min_subtotal_cents) return null;

  const cents = data.percent_off
    ? Math.round((subtotalCents * data.percent_off) / 100)
    : (data.amount_off_cents ?? 0);

  if (cents <= 0) return null;

  return { code: data.code, cents: Math.min(cents, subtotalCents) };
}
