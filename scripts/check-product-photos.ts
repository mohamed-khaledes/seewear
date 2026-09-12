/**
 * Every seeded product/colour pair must have a photograph on disk, and every
 * photograph must be claimed by a pair. Runs offline — no database needed.
 */
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { seedProducts } from "../supabase/seed/catalog";
import { productPhotoPath } from "../src/lib/utils/product-photos";

const publicDir = join(process.cwd(), "public");
const photoDir = join(publicDir, "products");

const expected = new Map<string, string>();
for (const product of seedProducts) {
  for (const color of product.colors) {
    const url = productPhotoPath(product.slug, color.name);
    expected.set(url, `${product.name} / ${color.name}`);
  }
}

const missing: string[] = [];
for (const [url, label] of expected) {
  if (!existsSync(join(publicDir, url))) missing.push(`${url}  (${label})`);
}

const onDisk = existsSync(photoDir)
  ? readdirSync(photoDir).filter((f) => f.endsWith(".webp"))
  : [];
const orphans = onDisk.filter((file) => !expected.has(`/products/${file}`));

console.log(`expected ${expected.size} photographs, found ${onDisk.length} files`);

if (missing.length) {
  console.error(`\nMISSING (${missing.length}):`);
  missing.forEach((m) => console.error("  " + m));
}
if (orphans.length) {
  console.error(`\nUNUSED (${orphans.length}):`);
  orphans.forEach((o) => console.error("  " + o));
}

if (missing.length || orphans.length) process.exit(1);
console.log("every product/colour pair has exactly one photograph");
