import { slugify } from "./slugify";

/**
 * Public path for a product photograph.
 *
 * One shot per product/colour pair — `imageForColor` looks the image up by the
 * selected colour, so the picture changes when the shopper changes the colour.
 * The files live in `public/products` and are named from the same slug and
 * colour the seed writes, which is what keeps the two in step.
 */
export function productPhotoPath(productSlug: string, colorName: string): string {
  return `/products/${productSlug}-${slugify(colorName)}.webp`;
}
