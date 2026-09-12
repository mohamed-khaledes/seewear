import { z } from "zod";

/** A cart line is a snapshot of a variant — enough to render without a fetch. */
export type CartLine = {
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  color: string | null;
  colorHex: string | null;
  size: string | null;
  priceCents: number;
  compareAtCents: number | null;
  imageUrl: string | null;
  quantity: number;
  /** Stock as of when the line was added — re-checked server-side at checkout. */
  maxStock: number;
};

export type CartTotals = {
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  itemCount: number;
};

/** What the browser is allowed to tell the server about a cart. */
export const cartLineInputSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.number().int().min(1).max(20),
});

export const cartInputSchema = z
  .array(cartLineInputSchema)
  .min(1, "Your bag is empty")
  .max(50);

export type CartLineInput = z.infer<typeof cartLineInputSchema>;

/** Server-recomputed line, priced from the database. */
export type PricedCartLine = {
  variantId: string;
  productId: string;
  name: string;
  slug: string;
  color: string | null;
  size: string | null;
  imageUrl: string | null;
  priceCents: number;
  quantity: number;
  stock: number;
};
