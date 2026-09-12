import { productPhotoPath } from "@/lib/utils/product-photos";
import { productModelPath } from "@/lib/utils/product-models";
import { AVAILABLE_MODELS } from "./available-models";
import type {
  ColorOption,
  ProductDetail,
  ProductListItem,
  ProductVariantRow,
  SizeOption,
} from "@/features/products/types";

type AnyProduct = ProductListItem | ProductDetail;

/**
 * The shot that depicts a colour, found by the colour in its file name.
 *
 * Deliberately not by array position. The colours come from `product.variants`
 * and the images from `product_images`, and nothing makes the database return
 * those two in the same order — it does not, which put the cobalt hoodie under
 * a "Jet Black" label. Images uploaded through the dashboard do not follow the
 * seed's naming, so callers keep a positional fallback for those.
 */
function shotForColor(
  product: AnyProduct,
  color: string,
): { url: string; alt: string | null } | null {
  const wanted = productPhotoPath(product.slug, color);
  return product.images.find((image) => image.url === wanted) ?? null;
}

/** Distinct colours in variant order, with the shot that goes with each. */
export function colorOptions(product: AnyProduct): ColorOption[] {
  const options = new Map<string, ColorOption>();

  product.variants.forEach((variant) => {
    if (!variant.color) return;
    const existing = options.get(variant.color);
    if (existing) {
      existing.inStock ||= variant.stock > 0;
      return;
    }
    options.set(variant.color, {
      name: variant.color,
      hex: variant.color_hex,
      imageUrl: null,
      inStock: variant.stock > 0,
    });
  });

  const list = [...options.values()];
  list.forEach((option, index) => {
    option.imageUrl =
      shotForColor(product, option.name)?.url ??
      product.images[index]?.url ??
      product.images[0]?.url ??
      null;
  });

  return list;
}

export function sizeOptions(product: AnyProduct, color: string | null): SizeOption[] {
  const relevant = product.variants.filter(
    (variant) => !color || variant.color === color,
  );

  const seen = new Map<string, SizeOption>();

  for (const variant of relevant) {
    const name = variant.size ?? "One Size";
    const existing = seen.get(name);
    if (existing) {
      existing.stock += variant.stock;
      existing.variantId ??= variant.stock > 0 ? variant.id : existing.variantId;
      continue;
    }
    seen.set(name, { name, stock: variant.stock, variantId: variant.id });
  }

  return [...seen.values()];
}

export function findVariant(
  product: ProductDetail,
  color: string | null,
  size: string | null,
): ProductVariantRow | null {
  return (
    product.variants.find(
      (variant) =>
        (color === null || variant.color === color) &&
        (size === null || (variant.size ?? "One Size") === size),
    ) ?? null
  );
}

/** A variant may override the product price; otherwise the product price stands. */
export function priceCentsFor(
  product: AnyProduct,
  variant?: { price_cents: number | null } | null,
): number {
  return variant?.price_cents ?? product.price_cents;
}

export function totalStock(product: AnyProduct): number {
  return product.variants.reduce((total, variant) => total + variant.stock, 0);
}

export function isSoldOut(product: AnyProduct): boolean {
  return product.variants.length > 0 && totalStock(product) === 0;
}

export function primaryImage(product: AnyProduct): { url: string; alt: string } | null {
  const image = product.images[0];
  if (!image) return null;
  return { url: image.url, alt: image.alt ?? product.name };
}

/** Image that matches a colour selection, falling back to the first shot. */
export function imageForColor(
  product: AnyProduct,
  color: string | null,
): { url: string; alt: string } | null {
  if (!color) return primaryImage(product);

  const matched = shotForColor(product, color);
  if (matched) {
    return { url: matched.url, alt: matched.alt ?? `${product.name} in ${color}` };
  }

  const index = colorOptions(product).findIndex((option) => option.name === color);
  const image = product.images[index] ?? product.images[0];

  if (!image) return null;
  return { url: image.url, alt: image.alt ?? `${product.name} in ${color}` };
}

/**
 * The 3D mesh for a colourway, or null when there is not one.
 *
 * Coverage is partial by design: a mesh is generated per colourway and the
 * catalogue is only partly done, so every caller has to handle null and fall
 * back to the photograph. `AVAILABLE_MODELS` is baked at build time by
 * `npm run models:manifest` — the browser cannot stat the filesystem, and
 * probing with a request per card would be worse than showing nothing.
 */
export function modelForColor(
  product: AnyProduct,
  color: string | null,
): string | null {
  return modelForSlugColor(product.slug, color ?? colorOptions(product)[0]?.name ?? null);
}

/**
 * The same lookup for callers that hold a snapshot rather than a product — a
 * cart line records the slug and colour it was bought in, nothing more.
 */
export function modelForSlugColor(
  slug: string,
  color: string | null,
): string | null {
  if (!color) return null;
  const path = productModelPath(slug, color);
  return AVAILABLE_MODELS.has(path) ? path : null;
}

/** Does any colourway of this product have a mesh? Used to offer the toggle. */
export function hasAnyModel(product: AnyProduct): boolean {
  return colorOptions(product).some((option) =>
    AVAILABLE_MODELS.has(productModelPath(product.slug, option.name)),
  );
}
