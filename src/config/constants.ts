import type { MessageKey } from "@/lib/i18n";

/** All money is stored and computed as integer piastres (EGP × 100). */
export const CURRENCY = "EGP" as const;

/** Flat express shipping, in piastres. */
export const SHIPPING_FLAT_CENTS = 8_000; // EGP 80.00
/** Orders at or above this subtotal ship free. */
export const FREE_SHIPPING_THRESHOLD_CENTS = 400_000; // EGP 4,000.00
/** Egyptian VAT applied to the subtotal, as a rate. */
export const TAX_RATE = 0.14;

export const PRODUCTS_PER_PAGE = 12;

/** A product with fewer than this many units across all variants reads as low. */
export const LOW_STOCK_THRESHOLD = 20;

/** Rows per page in the dashboard tables. */
export const ADMIN_PAGE_SIZE = 20;

export const ORDER_NUMBER_PREFIX = "SW";

export const STORAGE_BUCKET_PRODUCT_IMAGES = "product-images";

export const CART_STORAGE_KEY = "seewear.cart";

/** Remembers whether the shopper turned the 3D viewer on. */
export const VIEWER_3D_STORAGE_KEY = "seewear.viewer3d";

export const DEMO_BLOCKED_MESSAGE = "Demo mode — changes are disabled";

export const SORT_OPTIONS = [
  { value: "newest", label: "Newest", key: "filters.sortNewest" },
  { value: "price-asc", label: "Price: low to high", key: "filters.sortPriceAsc" },
  { value: "price-desc", label: "Price: high to low", key: "filters.sortPriceDesc" },
] as const satisfies readonly { value: string; label: string; key: MessageKey }[];

export type SortOption = (typeof SORT_OPTIONS)[number]["value"];

export const SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;
