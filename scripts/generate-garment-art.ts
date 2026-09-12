/**
 * Writes the garment vector art out as static SVG files in `public/garments`.
 * The seeded products point their `product_images.url` at these, so the
 * storefront has real image URLs before a single photo is uploaded.
 *
 *   npm run art:generate
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  GARMENT_ARTS,
  garmentFileName,
  garmentSvgDocument,
  type GarmentArtName,
} from "@/lib/utils/garments";
import { seedArtPairs } from "../supabase/seed/catalog";

/** Colours the hero and editorial blocks paint their decorative figures in. */
const DECORATIVE: { art: GarmentArtName; hex: string }[] = [
  ...GARMENT_ARTS.map((art) => ({ art, hex: "#e8e6df" })),
  { art: "hoodie", hex: "#cfccc4" },
  { art: "flannel", hex: "#7fa5c8" },
];

async function main() {
  const outDir = path.join(process.cwd(), "public", "garments");
  await mkdir(outDir, { recursive: true });

  const pairs = [...seedArtPairs(), ...DECORATIVE];
  const written = new Set<string>();

  for (const { art, hex } of pairs) {
    const fileName = garmentFileName(art, hex);
    if (written.has(fileName)) continue;
    written.add(fileName);
    await writeFile(path.join(outDir, fileName), garmentSvgDocument(art, hex), "utf8");
  }

  console.log(`Wrote ${written.size} garment shots to public/garments`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
