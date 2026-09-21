import { z } from "zod";

import type { Tables } from "@/types/database.types";
import type { OrderStatus, PaymentMethod } from "@/features/orders/services/utils/status";

export type OrderRow = Tables<"orders">;
export type OrderItemRow = Tables<"order_items">;
export type PaymentRow = Tables<"payments">;
export type OrderEventRow = Tables<"order_events">;

export type OrderShippingAddress = {
  fullName?: string;
  phone?: string;
  email?: string;
  line1?: string;
  line2?: string;
  city?: string;
  governorate?: string;
  postalCode?: string;
  country?: string;
};

export type OrderListItem = Pick<
  OrderRow,
  "id" | "order_number" | "status" | "total_cents" | "created_at" | "email"
> & {
  items: Pick<OrderItemRow, "name" | "color" | "size" | "quantity" | "image_url">[];
};

export type OrderDetail = OrderRow & {
  items: OrderItemRow[];
  payments: Pick<
    PaymentRow,
    "id" | "status" | "method" | "amount_cents" | "created_at" | "transaction_id" | "hmac_verified"
  >[];
  events: OrderEventRow[];
};

/** `shipping_address` is jsonb — read it through this, never cast blindly. */
export function readShippingAddress(value: unknown): OrderShippingAddress {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as OrderShippingAddress;
}

/* ------------------------------------------------------- public tracking */

export const trackOrderSchema = z.object({
  orderNumber: z
    .string()
    .trim()
    .min(3, "Your order number looks like SW-4821")
    .max(24),
  email: z.string().trim().email("Use the email you checked out with"),
});

export type TrackOrderValues = z.infer<typeof trackOrderSchema>;

/**
 * What a visitor sees after proving they know the order number *and* the email
 * it was placed with. Deliberately narrower than `OrderDetail`: enough to know
 * where the parcel is, not the full address on the label.
 */
export type TrackedOrder = {
  orderNumber: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  createdAt: string;
  totalCents: number;
  courier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  statusNote: string | null;
  /** "Maadi, Cairo" — enough to recognise the order, not enough to find a door. */
  shippingTo: string | null;
  items: {
    name: string;
    slug: string | null;
    color: string | null;
    size: string | null;
    quantity: number;
    imageUrl: string | null;
  }[];
  events: { status: OrderStatus; note: string | null; createdAt: string }[];
};

export type TrackOrderResult =
  | { ok: true; order: TrackedOrder }
  | { ok: false; error: string };
