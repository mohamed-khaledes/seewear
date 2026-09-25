import type { StatusTone } from "@/components/common/status-pill";
import type { MessageKey, Translator } from "@/lib/i18n";
import type { Enums } from "@/types/database.types";

export type OrderStatus = Enums<"order_status">;
export type PaymentMethod = "card" | "cod";

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
  confirmed: {
    label: "Confirmed",
    tone: "ok",
    blurb: "Confirmed and being packed. Pay in cash when it arrives.",
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

export const paymentMethodLabel: Record<PaymentMethod, string> = {
  card: "Card or wallet",
  cod: "Cash on delivery",
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

export type TimelineStep = {
  status: OrderStatus;
  label: MessageKey;
  /** What the customer is told while the order sits on this step. */
  waiting: MessageKey;
};

const CARD_TIMELINE: TimelineStep[] = [
  {
    status: "pending",
    label: "timeline.placedLabel",
    waiting: "timeline.placedWaitingCard",
  },
  { status: "paid", label: "timeline.paidLabel", waiting: "timeline.paidWaiting" },
  {
    status: "fulfilled",
    label: "timeline.shippedLabel",
    waiting: "timeline.shippedWaitingCard",
  },
  {
    status: "delivered",
    label: "timeline.deliveredLabel",
    waiting: "timeline.deliveredWaiting",
  },
];

/** Cash orders skip the payment step: the money changes hands at the door. */
const COD_TIMELINE: TimelineStep[] = [
  {
    status: "pending",
    label: "timeline.placedLabel",
    waiting: "timeline.placedWaitingCod",
  },
  {
    status: "confirmed",
    label: "timeline.confirmedLabel",
    waiting: "timeline.confirmedWaiting",
  },
  {
    status: "fulfilled",
    label: "timeline.shippedLabel",
    waiting: "timeline.shippedWaitingCod",
  },
  {
    status: "delivered",
    label: "timeline.deliveredCodLabel",
    waiting: "timeline.deliveredCodWaiting",
  },
];

/**
 * The customer-facing name for a status, in the language being read.
 *
 * `orderStatusMeta` keeps the English wording and the colour, because the
 * dashboard is English-only and a tone is not a word. Anything a customer sees
 * goes through these two instead.
 */
export function statusLabel(t: Translator, status: OrderStatus): string {
  return t(`orderStatus.${status}Label` as MessageKey);
}

export function statusBlurb(t: Translator, status: OrderStatus): string {
  return t(`orderStatus.${status}Blurb` as MessageKey);
}

export function timelineFor(method: PaymentMethod = "card"): TimelineStep[] {
  return method === "cod" ? COD_TIMELINE : CARD_TIMELINE;
}

/** The customer-facing card timeline. Kept for callers that predate cash orders. */
export const ORDER_TIMELINE = CARD_TIMELINE;

export function timelineIndex(status: OrderStatus, method: PaymentMethod = "card"): number {
  const index = timelineFor(method).findIndex((step) => step.status === status);
  return index === -1 ? 0 : index;
}

/**
 * How far along an admin may push an order by hand, from where it stands now.
 *
 * Only the journey a parcel takes. The statuses that are not here are not
 * oversights: `paid` arrives from the HMAC-verified Paymob callback, which is
 * also what completes the stock hold, so letting the dashboard set it would
 * mark money received that never was; `refunded` arrives from the Refund
 * action, so the status never claims money moved that did not; and `cancelled`
 * stays its own button, because stopping an order is not a step forward.
 */
export const ORDER_STATUS_FLOW: Record<OrderStatus, OrderStatus[]> = {
  pending: [],
  confirmed: ["fulfilled"],
  paid: ["fulfilled"],
  fulfilled: ["delivered"],
  delivered: [],
  cancelled: [],
  refunded: [],
};

export function canMoveOrder(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_STATUS_FLOW[from].includes(to);
}

/**
 * Whether an order can still be stopped, which always gives its stock back.
 * A shipped cash order can be: that is a parcel refused at the door.
 */
export function canCancel(status: OrderStatus, method: PaymentMethod): boolean {
  if (status === "pending" || status === "confirmed") return true;
  return status === "fulfilled" && method === "cod";
}

/**
 * Whether money has been taken that could be handed back. A card order once
 * Paymob has it; a cash order only after the courier collected it.
 */
export function canRefund(
  status: OrderStatus,
  method: PaymentMethod,
  refundedCents: number,
  totalCents: number,
): boolean {
  if (refundedCents >= totalCents) return false;
  if (method === "cod") return status === "delivered";
  return status === "paid" || status === "fulfilled" || status === "delivered";
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
