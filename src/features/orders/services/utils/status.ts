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
    label: "Shipped",
    tone: "ok",
    blurb: "Handed to the courier and on its way to you.",
  },
  delivered: {
    label: "Delivered",
    tone: "ok",
    blurb: "Delivered. Fourteen days to change your mind if it is not right.",
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
export const ORDER_TIMELINE: {
  status: OrderStatus;
  label: string;
  /** What the customer is told while the order sits on this step. */
  waiting: string;
}[] = [
  {
    status: "pending",
    label: "Order placed",
    waiting: "We have the order and are waiting for the payment to clear.",
  },
  {
    status: "paid",
    label: "Payment confirmed",
    waiting: "Paid. It is being picked and packed in Cairo.",
  },
  {
    status: "fulfilled",
    label: "Shipped",
    waiting: "With the courier. Two to four working days across Egypt.",
  },
  {
    status: "delivered",
    label: "Delivered",
    waiting: "Signed for. Enjoy it.",
  },
];

export function timelineIndex(status: OrderStatus): number {
  const index = ORDER_TIMELINE.findIndex((step) => step.status === status);
  return index === -1 ? 0 : index;
}

/**
 * How far along an admin may push an order by hand, from where it stands now.
 *
 * Only the journey a parcel takes. The three statuses that are not here are not
 * oversights: `paid` arrives from the HMAC-verified Paymob callback, which is
 * also the one thing that decrements stock, so letting the dashboard set it
 * would sell inventory twice; `refunded` arrives from the Refund action, so the
 * status never claims money moved that did not; and `cancelled` stays its own
 * button, because stopping an order is not a step forward.
 */
export const ORDER_STATUS_FLOW: Record<OrderStatus, OrderStatus[]> = {
  pending: [],
  paid: ["fulfilled"],
  fulfilled: ["delivered"],
  delivered: [],
  cancelled: [],
  refunded: [],
};

export function canMoveOrder(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_STATUS_FLOW[from].includes(to);
}

/** Where a consignment number is worth recording and worth showing. */
export function carriesTracking(status: OrderStatus): boolean {
  return status === "fulfilled" || status === "delivered";
}

/**
 * The couriers we hand parcels to, with the page that takes a consignment
 * number. The dashboard pre-fills the tracking link from these; the stored
 * `tracking_url` is what the customer actually follows, so a courier that is
 * not on this list only costs the admin a copy and paste.
 */
export const COURIERS: { name: string; trackingUrl?: (code: string) => string }[] = [
  { name: "Bosta", trackingUrl: (code) => `https://bosta.co/tracking-shipments?id=${code}` },
  { name: "Aramex", trackingUrl: (code) => `https://www.aramex.com/eg/en/track/results?ShipmentNumber=${code}` },
  { name: "Mylerz", trackingUrl: (code) => `https://mylerz.com.eg/track?code=${code}` },
  { name: "R2S", trackingUrl: (code) => `https://r2s.com.eg/track/${code}` },
  { name: "Egypt Post", trackingUrl: (code) => `https://egyptpost.gov.eg/en-eg/Home/eservices/track-and-trace?id=${code}` },
  { name: "Other" },
];

export function trackingUrlFor(courier: string, code: string): string {
  const match = COURIERS.find((entry) => entry.name === courier);
  const trimmed = code.trim();
  if (!match?.trackingUrl || !trimmed) return "";
  return match.trackingUrl(encodeURIComponent(trimmed));
}
