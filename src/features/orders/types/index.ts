import type { Tables } from "@/types/database.types";

export type OrderRow = Tables<"orders">;
export type OrderItemRow = Tables<"order_items">;
export type PaymentRow = Tables<"payments">;

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
};

/** `shipping_address` is jsonb — read it through this, never cast blindly. */
export function readShippingAddress(value: unknown): OrderShippingAddress {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as OrderShippingAddress;
}
