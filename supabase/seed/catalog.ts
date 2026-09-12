import type { GarmentArtName } from "@/lib/utils/garments";

/**
 * The seed catalogue. Prices are EGP piastres (amount × 100) — the same integer
 * money used everywhere else. `art` picks the placeholder vector shot generated
 * into `public/garments`.
 */

export type SeedCategory = { slug: string; name: string; position: number };

export const seedCategories: SeedCategory[] = [
  { slug: "247", name: "247", position: 1 },
  { slug: "t-shirts", name: "T-Shirts", position: 2 },
  { slug: "hoodies", name: "Hoodies", position: 3 },
  { slug: "outerwear", name: "Outerwear", position: 4 },
  { slug: "bottoms", name: "Bottoms", position: 5 },
  { slug: "accessories", name: "Accessories", position: 6 },
];

export type SeedColor = { name: string; hex: string };

export type SeedProduct = {
  slug: string;
  name: string;
  description: string;
  category: string;
  art: GarmentArtName;
  priceCents: number;
  compareAtCents: number | null;
  status: "active" | "draft";
  featured: boolean;
  colors: SeedColor[];
  sizes: string[];
  /** Per-variant stock, cycled across the colour × size matrix. */
  stockPattern: number[];
};

const APPAREL_SIZES = ["S", "M", "L", "XL", "XXL"];
const ONE_SIZE = ["One Size"];

export const seedProducts: SeedProduct[] = [
  {
    slug: "owners-club-hoodie",
    name: "Owners Club Hoodie",
    description:
      "A heavyweight 480gsm loopback hoodie, garment-dyed so it fades the way you want it to. Boxy through the body, ribbed cuffs, double-lined hood.",
    category: "hoodies",
    art: "hoodie",
    priceCents: 320_000,
    compareAtCents: 640_000,
    status: "active",
    featured: true,
    colors: [
      { name: "Cobalt", hex: "#1836ff" },
      { name: "Jet Black", hex: "#141414" },
      { name: "Bone", hex: "#e8e6df" },
      { name: "Moss", hex: "#4a5340" },
    ],
    sizes: APPAREL_SIZES,
    stockPattern: [18, 24, 31, 12, 6, 0, 14, 22],
  },
  {
    slug: "owners-club-t-shirt",
    name: "Owners Club T-Shirt",
    description:
      "The house tee. 240gsm combed cotton, tubular knit so it keeps its shape, with a screen-printed club crest at the chest.",
    category: "t-shirts",
    art: "tee",
    priceCents: 188_500,
    compareAtCents: 290_000,
    status: "active",
    featured: true,
    colors: [
      { name: "Jet Black", hex: "#141414" },
      { name: "Flat White", hex: "#f4f2ec" },
      { name: "Clay", hex: "#a5866c" },
    ],
    sizes: APPAREL_SIZES,
    stockPattern: [40, 55, 62, 28, 11, 33, 47],
  },
  {
    slug: "essential-tee",
    name: "Essential Tee",
    description:
      "Unbranded, mid-weight, cut a little longer in the body. The one you buy three of.",
    category: "t-shirts",
    art: "tee",
    priceCents: 145_000,
    compareAtCents: 220_000,
    status: "active",
    featured: true,
    colors: [
      { name: "Flat White", hex: "#f4f2ec" },
      { name: "Jet Black", hex: "#141414" },
      { name: "Ash", hex: "#9a9a95" },
      { name: "Navy", hex: "#1e2a45" },
    ],
    sizes: APPAREL_SIZES,
    stockPattern: [60, 45, 38, 52, 19, 7],
  },
  {
    slug: "247-oversized-tank",
    name: "247 Oversized Tank",
    description:
      "Dropped armhole, raw-edge neckline, washed for softness. Built for the gym and everything after it.",
    category: "247",
    art: "tank",
    priceCents: 192_000,
    compareAtCents: 240_000,
    status: "active",
    featured: true,
    colors: [
      { name: "Jet Black", hex: "#141414" },
      { name: "Bone", hex: "#e8e6df" },
    ],
    sizes: APPAREL_SIZES,
    stockPattern: [22, 16, 9, 4, 0, 27],
  },
  {
    slug: "down-puffer-jacket",
    name: "Down Puffer Jacket",
    description:
      "700-fill responsibly sourced down under a matte recycled shell. Baffled construction, storm cuffs, two-way zip.",
    category: "outerwear",
    art: "puffer",
    priceCents: 896_000,
    compareAtCents: 1_280_000,
    status: "active",
    featured: true,
    colors: [
      { name: "Black", hex: "#161616" },
      { name: "Slate", hex: "#3f4750" },
    ],
    sizes: APPAREL_SIZES,
    stockPattern: [8, 12, 15, 6, 2, 11],
  },
  {
    slug: "flannel-overshirt",
    name: "Flannel Overshirt",
    description:
      "Brushed cotton check, cut as an overshirt rather than a shirt — wear it open over the Essential Tee.",
    category: "outerwear",
    art: "flannel",
    priceCents: 364_000,
    compareAtCents: 520_000,
    status: "active",
    featured: false,
    colors: [
      { name: "Blue Check", hex: "#28405f" },
      { name: "Rust Check", hex: "#8c4a2f" },
    ],
    sizes: APPAREL_SIZES,
    stockPattern: [14, 21, 17, 5, 0, 9],
  },
  {
    slug: "varsity-jacket",
    name: "Varsity Jacket",
    description:
      "Melton wool body, leather sleeves, chain-stitched lettering. Heavy in the way outerwear should be.",
    category: "outerwear",
    art: "jacket",
    priceCents: 805_000,
    compareAtCents: 1_150_000,
    status: "active",
    featured: false,
    colors: [
      { name: "Black / Cream", hex: "#161616" },
      { name: "Navy / Cream", hex: "#1e2a45" },
    ],
    sizes: APPAREL_SIZES,
    stockPattern: [4, 7, 9, 3, 1],
  },
  {
    slug: "cargo-pant",
    name: "Cargo Pant",
    description:
      "Washed ripstop with a relaxed straight leg, bellowed thigh pockets and a drawcord hem.",
    category: "bottoms",
    art: "pant",
    priceCents: 322_000,
    compareAtCents: 460_000,
    status: "active",
    featured: false,
    colors: [
      { name: "Washed Grey", hex: "#8a8578" },
      { name: "Black", hex: "#161616" },
      { name: "Olive", hex: "#4f5238" },
    ],
    sizes: APPAREL_SIZES,
    stockPattern: [16, 23, 30, 12, 5, 18],
  },
  {
    slug: "247-track-pant",
    name: "247 Track Pant",
    description:
      "Tapered French terry with a zipped hem gusset. The other half of the 247 set.",
    category: "247",
    art: "pant",
    priceCents: 276_000,
    compareAtCents: 345_000,
    status: "active",
    featured: false,
    colors: [
      { name: "Jet Black", hex: "#141414" },
      { name: "Ash", hex: "#9a9a95" },
    ],
    sizes: APPAREL_SIZES,
    stockPattern: [26, 19, 14, 8, 3],
  },
  {
    slug: "owners-club-cap",
    name: "Owners Club Cap",
    description:
      "Six-panel washed twill, unstructured crown, brass slider closure. Embroidered crest at the front.",
    category: "accessories",
    art: "cap",
    priceCents: 224_000,
    compareAtCents: 320_000,
    status: "active",
    featured: true,
    colors: [
      { name: "Black", hex: "#141414" },
      { name: "Bone", hex: "#e8e6df" },
      { name: "Cobalt", hex: "#1836ff" },
    ],
    sizes: ONE_SIZE,
    stockPattern: [45, 30, 12],
  },
  {
    slug: "owners-club-beanie",
    name: "Owners Club Beanie",
    description: "Ribbed merino blend with a folded cuff and a woven label.",
    category: "accessories",
    art: "cap",
    priceCents: 112_000,
    compareAtCents: 160_000,
    status: "active",
    featured: false,
    colors: [
      { name: "Charcoal", hex: "#2a2a2a" },
      { name: "Bone", hex: "#e8e6df" },
    ],
    sizes: ONE_SIZE,
    stockPattern: [38, 6],
  },
  {
    slug: "boxfit-tee-draft",
    name: "Box-Fit Tee",
    description:
      "Wider, shorter, heavier. Landing next season — this one is not live yet.",
    category: "t-shirts",
    art: "tee",
    priceCents: 210_000,
    compareAtCents: null,
    status: "draft",
    featured: false,
    colors: [{ name: "Bone", hex: "#e8e6df" }],
    sizes: APPAREL_SIZES,
    stockPattern: [0],
  },
];

/** Every distinct art/colour pair the catalogue needs a shot for. */
export function seedArtPairs(): { art: GarmentArtName; hex: string }[] {
  const seen = new Set<string>();
  const pairs: { art: GarmentArtName; hex: string }[] = [];

  for (const product of seedProducts) {
    for (const color of product.colors) {
      const key = `${product.art}:${color.hex}`;
      if (seen.has(key)) continue;
      seen.add(key);
      pairs.push({ art: product.art, hex: color.hex });
    }
  }

  return pairs;
}
