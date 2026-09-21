import "server-only";

import { DEFAULT_PRICING_RULES, type PricingRules } from "@/lib/pricing";
import type { SupabaseAdminClient } from "@/lib/supabase/admin";
import { computeTotals } from "@/features/cart/services/utils/totals";
import type { CartLineInput, CartTotals, PricedCartLine } from "@/features/cart/types";

export type RepricedCart = {
  lines: PricedCartLine[];
  totals: CartTotals;
  discount: { code: string; cents: number } | null;
  /** Why a submitted code was turned down, in words a shopper can act on. */
  discountRejection: string | null;
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

export type RepriceOptions = {
  rules?: PricingRules;
  /** Unknown until the address form is filled; the flat rate applies until then. */
  governorate?: string | null;
  /** Needed to enforce once-per-customer codes. */
  email?: string | null;
  userId?: string | null;
};

/**
 * Rebuilds the cart from the database: every price, every stock level, the
 * shipping rate for the governorate and the discount are read server-side. The
 * browser only ever says which variants and how many.
 */
export async function repriceCart(
  admin: SupabaseAdminClient,
  items: CartLineInput[],
  discountCode?: string,
  options: RepriceOptions = {},
): Promise<RepricedCart> {
  const rules = options.rules ?? DEFAULT_PRICING_RULES;
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

  let discount: RepricedCart["discount"] = null;
  let discountRejection: string | null = null;

  if (discountCode?.trim()) {
    const verdict = await evaluateDiscount(admin, discountCode, sumSubtotal(lines), options);
    if (verdict.ok) discount = { code: verdict.code, cents: verdict.cents };
    else discountRejection = verdict.reason;
  }

  return {
    lines,
    totals: computeTotals(lines, discount?.cents ?? 0, rules, options.governorate),
    discount,
    discountRejection,
  };
}

function sumSubtotal(lines: PricedCartLine[]): number {
  return lines.reduce((total, line) => total + line.priceCents * line.quantity, 0);
}

type DiscountVerdict =
  | { ok: true; code: string; cents: number }
  | { ok: false; reason: string };

/**
 * Validates a code against the database, including how often it has been used.
 *
 * A use is any order carrying the code that has not been cancelled — pending
 * included. That mirrors the stock hold: an unpaid checkout keeps its claim
 * until the expiry job releases it, so a limited code cannot be spent twice by
 * two checkouts racing each other through Paymob.
 */
export async function evaluateDiscount(
  admin: SupabaseAdminClient,
  code: string,
  subtotalCents: number,
  options: Pick<RepriceOptions, "email" | "userId"> = {},
): Promise<DiscountVerdict> {
  const trimmed = code.trim();
  const unknown = { ok: false as const, reason: "That code is not valid." };
  if (!trimmed) return unknown;

  const { data, error } = await admin
    .from("discount_codes")
    .select(
      "code, percent_off, amount_off_cents, min_subtotal_cents, active, expires_at, usage_limit, once_per_customer",
    )
    .eq("code", trimmed)
    .maybeSingle();

  if (error || !data || !data.active) return unknown;

  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return { ok: false, reason: "That code has expired." };
  }

  if (subtotalCents < data.min_subtotal_cents) {
    return {
      ok: false,
      reason: `That code needs a bag of at least EGP ${(data.min_subtotal_cents / 100).toLocaleString("en-EG")}.`,
    };
  }

  if (data.usage_limit !== null) {
    const { count } = await admin
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("discount_code", data.code)
      .neq("status", "cancelled");

    if ((count ?? 0) >= data.usage_limit) {
      return { ok: false, reason: "That code has been used up." };
    }
  }

  if (data.once_per_customer && (options.email || options.userId)) {
    // Two plain filters rather than one `or()` string: an email is user input,
    // and building a filter expression out of it invites quoting bugs.
    const used = (column: "email" | "user_id", value: string) =>
      admin
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("discount_code", data.code)
        .neq("status", "cancelled")
        .eq(column, value);

    const [byEmail, byUser] = await Promise.all([
      options.email ? used("email", options.email.trim()) : null,
      options.userId ? used("user_id", options.userId) : null,
    ]);

    if ((byEmail?.count ?? 0) > 0 || (byUser?.count ?? 0) > 0) {
      return { ok: false, reason: "You have already used that code." };
    }
  }

  const cents = data.percent_off
    ? Math.round((subtotalCents * data.percent_off) / 100)
    : (data.amount_off_cents ?? 0);

  if (cents <= 0) return unknown;

  return { ok: true, code: data.code, cents: Math.min(cents, subtotalCents) };
}

/** Kept for callers that only need the amount. */
export async function resolveDiscount(
  admin: SupabaseAdminClient,
  code: string,
  subtotalCents: number,
): Promise<{ code: string; cents: number } | null> {
  const verdict = await evaluateDiscount(admin, code, subtotalCents);
  return verdict.ok ? { code: verdict.code, cents: verdict.cents } : null;
}
