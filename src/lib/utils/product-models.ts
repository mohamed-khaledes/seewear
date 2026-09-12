import { slugify } from "./slugify";

/**
 * Public path for a product's 3D mesh, named exactly like its photograph so the
 * two stay in step: `<product-slug>-<colour-slug>.glb` in `public/models`.
 *
 * Not every product/colour has one — the meshes are generated per colourway and
 * the catalogue is only partly covered. `hasProductModel` is the check; callers
 * must fall back to the photograph when it returns false, never assume a file
 * is there.
 */
export function productModelPath(productSlug: string, colorName: string): string {
  return `/models/${productSlug}-${slugify(colorName)}.glb`;
}
