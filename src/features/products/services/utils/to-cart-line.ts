import type { CartLine } from "@/features/cart/types";
import type {
  ProductDetail,
  ProductListItem,
  ProductVariantRow,
} from "@/features/products/types";

import { imageForColor, priceCentsFor } from "./variants";

type AnyProduct = ProductListItem | ProductDetail;
type AnyVariant = Pick<
  ProductVariantRow,
  "id" | "color" | "color_hex" | "size" | "stock" | "price_cents"
>;

/** Snapshot a variant into a bag line. Prices are re-checked server-side. */
export function toCartLine(
  product: AnyProduct,
  variant: AnyVariant,
  quantity = 1,
): CartLine {
  return {
    variantId: variant.id,
    productId: product.id,
    slug: product.slug,
    name: product.name,
    color: variant.color,
    colorHex: variant.color_hex,
    size: variant.size,
    priceCents: priceCentsFor(product, variant),
    compareAtCents: product.compare_at_cents,
    imageUrl: imageForColor(product, variant.color)?.url ?? null,
    quantity,
    maxStock: variant.stock,
  };
}
