import type { StatusTone } from "@/components/common/status-pill";
import type { Enums } from "@/types/database.types";

export type OrderStatus = Enums<"order_status">;

/** One vocabulary for order state, shared by the storefront and the dashboard. */
export const orderStatusMeta: Record<
  OrderStatus,
  { label: string; tone: StatusTone; blurb: string }
> = {
  pending: {
    label: "Awaiting payment",
    tone: "warn",
    blurb: "We are waiting on the payment provider to confirm.",
  },
  paid: {
    label: "Paid",
    tone: "ok",
    blurb: "Payment confirmed. We are packing it now.",
  },
  fulfilled: {
    label: "Fulfilled",
    tone: "ok",
    blurb: "Handed to the courier and on its way.",
  },
  cancelled: {
    label: "Cancelled",
    tone: "mut",
    blurb: "This order was cancelled. Nothing was charged.",
  },
  refunded: {
    label: "Refunded",
    tone: "err",
    blurb: "The payment was returned to the original card.",
  },
};

export const paymentStatusMeta: Record<string, { label: string; tone: StatusTone }> = {
  success: { label: "Succeeded", tone: "ok" },
  pending: { label: "Pending", tone: "warn" },
  declined: { label: "Declined", tone: "err" },
  refunded: { label: "Refunded", tone: "err" },
};

export function paymentStatus(status: string) {
  return paymentStatusMeta[status] ?? { label: status, tone: "mut" as StatusTone };
}

/** The customer-facing timeline. Cancelled and refunded orders skip it. */
export const ORDER_TIMELINE: { status: OrderStatus; label: string }[] = [
  { status: "pending", label: "Order placed" },
  { status: "paid", label: "Payment confirmed" },
  { status: "fulfilled", label: "On its way" },
];

export function timelineIndex(status: OrderStatus): number {
  const index = ORDER_TIMELINE.findIndex((step) => step.status === status);
  return index === -1 ? 0 : index;
}
