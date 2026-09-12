/**
 * Offline check that the seed catalogue produces one SKU per product/colour/size
 * triple. Run before touching the database: `npx tsx scripts/check-seed-skus.ts`
 */
import { slugify } from "@/lib/utils/slugify";
import { seedProducts } from "../supabase/seed/catalog";

const skus: string[] = [];
const combos: string[] = [];

for (const product of seedProducts) {
  for (const color of product.colors) {
    for (const size of product.sizes) {
      skus.push(
        ["SW", product.slug, slugify(color.name), slugify(size)].join("-").toUpperCase(),
      );
      combos.push(`${product.slug}|${color.name}|${size}`);
    }
  }
}

function duplicates(list: string[]): [string, number][] {
  const seen = new Map<string, number>();
  for (const value of list) seen.set(value, (seen.get(value) ?? 0) + 1);
  return [...seen.entries()].filter(([, count]) => count > 1);
}

const skuDupes = duplicates(skus);
const comboDupes = duplicates(combos);

console.log("variant rows      :", skus.length);
console.log("distinct SKUs     :", new Set(skus).size);
console.log("SKU duplicates    :", skuDupes.length ? skuDupes : "none");
console.log("colour/size dupes :", comboDupes.length ? comboDupes : "none");
console.log("\nowners-club samples:");
for (const sku of skus.filter((s) => s.includes("OWNERS-CLUB")).slice(0, 6)) {
  console.log("  ", sku);
}

if (skuDupes.length > 0 || comboDupes.length > 0) process.exit(1);
