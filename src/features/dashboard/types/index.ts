import { z } from "zod";

import type { Enums, Tables } from "@/types/database.types";

export type DashboardStats = {
  range_days: number;
  revenue_cents: number;
  previous_revenue_cents: number;
  orders_count: number;
  previous_orders_count: number;
  aov_cents: number;
  previous_aov_cents: number;
  completion_rate: number;
  previous_completion_rate: number;
  series: { day: string; revenue_cents: number }[];
  top_products: {
    product_id: string | null;
    name: string;
    image_url: string | null;
    revenue_cents: number;
    units: number;
  }[];
  recent_orders: {
    id: string;
    order_number: string;
    email: string;
    status: Enums<"order_status">;
    total_cents: number;
    created_at: string;
    customer: string;
    item_count: number;
  }[];
  low_stock: {
    name: string;
    slug: string;
    color: string | null;
    size: string | null;
    stock: number;
  }[];
};

export type AdminProductRow = Tables<"products"> & {
  category: { slug: string; name: string } | null;
  images: { url: string; position: number }[];
  variants: {
    id: string;
    color: string | null;
    color_hex: string | null;
    size: string | null;
    sku: string | null;
    stock: number;
  }[];
};

export type AdminOrderRow = Pick<
  Tables<"orders">,
  | "id"
  | "order_number"
  | "email"
  | "status"
  | "total_cents"
  | "created_at"
  | "fulfilled_at"
> & {
  customer: string | null;
  item_count: number;
};

export type AdminOrderDetail = Tables<"orders"> & {
  items: Tables<"order_items">[];
  payments: Tables<"payments">[];
  events: Tables<"order_events">[];
  profile: { full_name: string | null; phone: string | null } | null;
};

export type CustomerRow = Tables<"profiles"> & {
  order_count: number;
  lifetime_cents: number;
  email: string | null;
};

/** A category with how much of the catalogue actually sits in it. */
export type CategoryRow = Tables<"categories"> & {
  product_count: number;
  active_count: number;
};

/** A code with how often it has been spent — any order that was not cancelled. */
export type DiscountWithUsage = Tables<"discount_codes"> & { uses: number };

export type PaymentRow = Tables<"payments"> & {
  order: { order_number: string } | null;
};

export type PaymentsSummary = {
  /** Paging for the transactions table; the balances above it cover everything. */
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
  succeededCents: number;
  pendingCents: number;
  refundedCents: number;
  transactions: PaymentRow[];
};

/* ------------------------------------------------------------------ forms */

const moneyField = z
  .number({ message: "Enter an amount in EGP" })
  .min(0, "Prices cannot be negative")
  .max(10_000_000, "That is more than we can charge");

export const productVariantFormSchema = z.object({
  id: z.string().optional(),
  color: z.string().trim().max(40),
  colorHex: z
    .string()
    .trim()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Use a hex colour like #1836ff"),
  size: z.string().trim().max(20),
  sku: z.string().trim().max(60),
  stock: z.number().int().min(0, "Stock cannot be negative").max(100_000),
});

export const productFormSchema = z.object({
  name: z.string().trim().min(2, "Give it a name").max(120),
  slug: z
    .string()
    .trim()
    .min(2, "Slugs need at least two characters")
    .max(120)
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers and hyphens only"),
  description: z.string().trim().max(2000),
  categoryId: z.string(),
  status: z.enum(["active", "draft"]),
  featured: z.boolean(),
  /** EGP, converted to piastres before it touches the database. */
  price: moneyField,
  compareAt: moneyField,
  imageUrls: z.array(z.string().trim().min(1)),
  variants: z.array(productVariantFormSchema),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;
export type ProductVariantFormValues = z.infer<typeof productVariantFormSchema>;

export const storeSettingsFormSchema = z.object({
  storeName: z.string().trim().min(2).max(60),
  supportEmail: z.string().trim().email("That email looks off"),
  supportPhone: z.string().trim().max(24),
  announcement: z.string().trim().max(160),
  freeShippingThreshold: moneyField,
  shippingFlat: moneyField,
  taxRatePercent: z.number().min(0, "Cannot be negative").max(99, "That is not a rate"),
  codEnabled: z.boolean(),
  /** Printed in the footer and on every invoice. Empty fields are left off. */
  legalName: z.string().trim().max(120),
  commercialRegister: z.string().trim().max(40),
  taxRegistration: z.string().trim().max(40),
  registeredAddress: z.string().trim().max(200),
});

export type StoreSettingsFormValues = z.infer<typeof storeSettingsFormSchema>;

export const shippingRateRowSchema = z.object({
  governorate: z.string().trim().min(2).max(60),
  /** EGP, or null to fall back to the flat rate. */
  rate: z.number().min(0, "Cannot be negative").max(10_000).nullable(),
  deliveryDays: z.string().trim().max(30),
});

export const shippingRatesFormSchema = z.object({
  rows: z.array(shippingRateRowSchema).max(40),
});

export type ShippingRatesFormValues = z.infer<typeof shippingRatesFormSchema>;

export const discountFormSchema = z
  .object({
    /** Blank for a code that never runs out. */
    usageLimit: z.number().int().min(0).max(1_000_000),
    oncePerCustomer: z.boolean(),
    /** yyyy-mm-dd from a date input, or blank for no expiry. */
    expiresOn: z.string().trim().max(10),
    code: z
      .string()
      .trim()
      .min(3, "Codes need at least three characters")
      .max(40)
      .regex(/^[A-Za-z0-9_-]+$/, "Letters, numbers, dashes and underscores only"),
    kind: z.enum(["percent", "amount"]),
    percentOff: z.number().int().min(1).max(100),
    amountOff: moneyField,
    minSubtotal: moneyField,
    active: z.boolean(),
  })
  .refine((values) => values.kind !== "amount" || values.amountOff > 0, {
    message: "Enter an amount off",
    path: ["amountOff"],
  });

export type DiscountFormValues = z.infer<typeof discountFormSchema>;

export const categoryFormSchema = z.object({
  name: z.string().trim().min(2, "Give it a name").max(60),
  slug: z
    .string()
    .trim()
    .min(2, "Slugs need at least two characters")
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers and hyphens only"),
  /** Lower sorts first. The filter rail and the storefront both read it. */
  position: z.number().int().min(0, "Cannot be negative").max(999),
});

export type CategoryFormValues = z.infer<typeof categoryFormSchema>;

/**
 * Moving one order along. The server checks `status` again against the allowed
 * transitions — this schema only shapes the form.
 */
export const orderStatusFormSchema = z
  .object({
    status: z.enum([
      "pending",
      "confirmed",
      "paid",
      "fulfilled",
      "delivered",
      "cancelled",
      "refunded",
    ]),
    note: z.string().trim().max(200, "Keep it under 200 characters"),
    courier: z.string().trim().max(40),
    trackingNumber: z.string().trim().max(60),
    trackingUrl: z.string().trim().max(400),
  })
  .refine((values) => !values.trackingUrl || /^https?:\/\//.test(values.trackingUrl), {
    message: "Tracking links need to start with http:// or https://",
    path: ["trackingUrl"],
  });

export type OrderStatusFormValues = z.infer<typeof orderStatusFormSchema>;

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

/**
 * One page of an admin table. `total` is the count across the whole filtered
 * set, not this page — the pager needs it to know how many pages there are.
 */
export type AdminPage<T> = {
  rows: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
};
