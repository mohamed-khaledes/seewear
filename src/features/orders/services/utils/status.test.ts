import { describe, expect, it } from "vitest";

import {
  canCancel,
  canMoveOrder,
  canRefund,
  ORDER_STATUS_FLOW,
  orderStatusMeta,
  timelineFor,
  timelineIndex,
  trackingUrlFor,
  type OrderStatus,
} from "@/features/orders/services/utils/status";

const ALL: OrderStatus[] = [
  "pending",
  "confirmed",
  "paid",
  "fulfilled",
  "delivered",
  "cancelled",
  "refunded",
];

describe("the order journey", () => {
  it("describes every status", () => {
    for (const status of ALL) {
      expect(orderStatusMeta[status].label).toBeTruthy();
      expect(ORDER_STATUS_FLOW[status]).toBeDefined();
    }
  });

  it("never lets the dashboard mark an order paid or refunded by hand", () => {
    for (const status of ALL) {
      expect(canMoveOrder(status, "paid")).toBe(false);
      expect(canMoveOrder(status, "refunded")).toBe(false);
    }
  });

  it("moves forward one step at a time", () => {
    expect(canMoveOrder("paid", "fulfilled")).toBe(true);
    expect(canMoveOrder("confirmed", "fulfilled")).toBe(true);
    expect(canMoveOrder("fulfilled", "delivered")).toBe(true);
    expect(canMoveOrder("paid", "delivered")).toBe(false);
    expect(canMoveOrder("delivered", "fulfilled")).toBe(false);
  });
});

describe("cancelling", () => {
  it("stops an unpaid or confirmed order", () => {
    expect(canCancel("pending", "card")).toBe(true);
    expect(canCancel("confirmed", "cod")).toBe(true);
  });

  it("refuses a paid card order, which has to be refunded instead", () => {
    expect(canCancel("paid", "card")).toBe(false);
    expect(canCancel("fulfilled", "card")).toBe(false);
  });

  it("allows a shipped cash order, which is a parcel refused at the door", () => {
    expect(canCancel("fulfilled", "cod")).toBe(true);
    expect(canCancel("delivered", "cod")).toBe(false);
  });
});

describe("refunding", () => {
  it("refunds a card order once money has been taken", () => {
    expect(canRefund("pending", "card", 0, 1000)).toBe(false);
    expect(canRefund("paid", "card", 0, 1000)).toBe(true);
    expect(canRefund("delivered", "card", 0, 1000)).toBe(true);
  });

  it("refunds a cash order only after the cash was collected", () => {
    expect(canRefund("confirmed", "cod", 0, 1000)).toBe(false);
    expect(canRefund("fulfilled", "cod", 0, 1000)).toBe(false);
    expect(canRefund("delivered", "cod", 0, 1000)).toBe(true);
  });

  it("stops once everything has been refunded", () => {
    expect(canRefund("delivered", "card", 400, 1000)).toBe(true);
    expect(canRefund("delivered", "card", 1000, 1000)).toBe(false);
  });
});

describe("timelines", () => {
  it("gives a cash order no payment step", () => {
    const cash = timelineFor("cod").map((step) => step.status);
    expect(cash).not.toContain("paid");
    expect(cash).toContain("confirmed");
  });

  it("places each status on its own timeline", () => {
    expect(timelineIndex("paid", "card")).toBe(1);
    expect(timelineIndex("confirmed", "cod")).toBe(1);
    expect(timelineIndex("delivered", "cod")).toBe(3);
  });
});

describe("courier links", () => {
  it("builds a link for a known courier and encodes the number", () => {
    expect(trackingUrlFor("Bosta", " 41 72 ")).toBe(
      "https://bosta.co/tracking-shipments?id=41%2072",
    );
  });

  it("builds nothing for an unknown courier or an empty number", () => {
    expect(trackingUrlFor("Other", "123")).toBe("");
    expect(trackingUrlFor("Bosta", "  ")).toBe("");
  });
});
