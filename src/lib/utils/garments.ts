/**
 * The garment vector art from the prototype, kept as one source of truth.
 *
 * Two consumers:
 *  - `scripts/generate-garment-art.mjs` writes these out as static SVG files in
 *    `public/garments`, which is what the seeded products point at.
 *  - `<GarmentArt />` renders them inline for hero and editorial decoration.
 */

export const GARMENT_ARTS = [
  "tee",
  "hoodie",
  "cap",
  "tank",
  "jacket",
  "flannel",
  "puffer",
  "pant",
] as const;

export type GarmentArtName = (typeof GARMENT_ARTS)[number];

export function isGarmentArt(value: string): value is GarmentArtName {
  return (GARMENT_ARTS as readonly string[]).includes(value);
}

/** Inner markup of the 200×200 viewBox, coloured with `color`. */
export function garmentMarkup(
  art: GarmentArtName,
  color: string,
  idSuffix = "",
): string {
  switch (art) {
    case "tee":
      return `<path d="M72 32 L54 42 L28 58 L44 84 L60 75 L60 172 L140 172 L140 75 L156 84 L172 58 L146 42 L128 32 C128 47 115 54 100 54 C85 54 72 47 72 32 Z" fill="${color}"/>`;
    case "hoodie":
      return [
        `<path d="M70 30 C70 46 130 46 130 30 L150 44 L172 66 L156 92 L142 82 L142 174 L58 174 L58 82 L44 92 L28 66 L50 44 Z" fill="${color}"/>`,
        `<path d="M74 30 C74 54 126 54 126 30 C118 46 82 46 74 30 Z" fill="rgba(0,0,0,.22)"/>`,
        `<rect x="78" y="120" width="44" height="34" rx="4" fill="rgba(0,0,0,.14)"/>`,
        `<path d="M92 34 v20 M108 34 v20" stroke="rgba(0,0,0,.25)" stroke-width="3"/>`,
      ].join("");
    case "cap":
      return [
        `<path d="M42 116 C42 66 158 66 158 116 L42 116 Z" fill="${color}"/>`,
        `<path d="M40 116 L20 128 L26 138 L158 138 L158 116 Z" fill="${color}"/>`,
        `<path d="M42 116 C42 66 158 66 158 116" fill="none" stroke="rgba(0,0,0,.18)" stroke-width="2"/>`,
        `<circle cx="100" cy="70" r="4" fill="rgba(0,0,0,.3)"/>`,
      ].join("");
    case "tank":
      return `<path d="M76 34 C76 30 82 28 82 40 C82 58 66 62 62 78 L62 172 L138 172 L138 78 C134 62 118 58 118 40 C118 28 124 30 124 34 C124 52 112 56 100 56 C88 56 76 52 76 34 Z" fill="${color}"/>`;
    case "jacket":
      return [
        `<path d="M72 30 L52 40 L30 60 L46 86 L58 78 L58 174 L98 174 L98 40 Z" fill="${color}"/>`,
        `<path d="M128 30 L148 40 L170 60 L154 86 L142 78 L142 174 L102 174 L102 40 Z" fill="${color}"/>`,
        `<path d="M98 40 L98 174 M102 40 L102 174" stroke="rgba(0,0,0,.3)" stroke-width="2"/>`,
        `<circle cx="94" cy="70" r="2.6" fill="rgba(0,0,0,.4)"/>`,
        `<circle cx="94" cy="95" r="2.6" fill="rgba(0,0,0,.4)"/>`,
        `<circle cx="94" cy="120" r="2.6" fill="rgba(0,0,0,.4)"/>`,
      ].join("");
    case "flannel": {
      const id = `chk${idSuffix}`;
      return [
        `<defs><pattern id="${id}" width="20" height="20" patternUnits="userSpaceOnUse">`,
        `<rect width="20" height="20" fill="${color}"/>`,
        `<rect width="10" height="20" fill="rgba(255,255,255,.22)"/>`,
        `<rect width="20" height="10" fill="rgba(255,255,255,.16)"/>`,
        `</pattern></defs>`,
        `<path d="M70 30 L50 42 L30 62 L46 88 L58 80 L58 174 L142 174 L142 80 L154 88 L170 62 L150 42 L130 30 L100 46 Z" fill="url(#${id})"/>`,
        `<path d="M100 46 L100 174" stroke="rgba(0,0,0,.25)" stroke-width="2"/>`,
      ].join("");
    }
    case "puffer":
      return [
        `<path d="M70 30 C70 44 130 44 130 30 L152 46 L150 174 L50 174 L48 46 Z" fill="${color}"/>`,
        `<path d="M50 70 h100 M50 100 h100 M50 130 h100 M50 160 h100" stroke="rgba(0,0,0,.22)" stroke-width="3"/>`,
        `<rect x="94" y="46" width="12" height="128" fill="rgba(0,0,0,.18)"/>`,
      ].join("");
    case "pant":
      return [
        `<path d="M64 24 L136 24 L134 60 L128 176 L104 176 L100 84 L96 176 L72 176 L66 60 Z" fill="${color}"/>`,
        `<path d="M64 24 L136 24 L134 44 L66 44 Z" fill="rgba(0,0,0,.15)"/>`,
      ].join("");
  }
}

/** A complete, standalone SVG document — used for the files in `public/garments`. */
export function garmentSvgDocument(art: GarmentArtName, color: string): string {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" role="img">`,
    garmentMarkup(art, color, `-${art}`),
    `</svg>`,
  ].join("");
}

/** Stable file name for an art/colour pair, e.g. `hoodie-1836ff.svg`. */
export function garmentFileName(art: GarmentArtName, color: string): string {
  return `${art}-${color.replace("#", "").toLowerCase()}.svg`;
}

/** Public path the seeded `product_images.url` points at. */
export function garmentImagePath(art: GarmentArtName, color: string): string {
  return `/garments/${garmentFileName(art, color)}`;
}
