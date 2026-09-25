import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { bostaDriver, forgetBostaCities, isBostaConfigured } from "./bosta";
import { CourierError, type ShipmentRequest } from "./types";

/**
 * Bosta is never called here. What is being checked is the shape of the request
 * the store sends it and what it does with the answer — the parts a staging
 * account would confirm once and then never test again.
 */

const CITIES = {
  data: [
    { _id: "EG-01", name: "Cairo", nameAr: "القاهرة" },
    { _id: "EG-02", name: "Alexandria", nameAr: "الإسكندرية" },
    { _id: "EG-06", name: "El Sharqia", nameAr: "الشرقية" },
  ],
};

const address = {
  fullName: "Nour Abdel Rahman",
  phone: "01001234567",
  email: "nour@example.com",
  line1: "12 Road 9",
  line2: "Flat 4",
  city: "Maadi",
  governorate: "Cairo",
  country: "Egypt",
};

const request: ShipmentRequest = {
  orderNumber: "SW-4821",
  address,
  itemsCount: 2,
  collectCents: 122_000,
  notes: "SEEWEAR SW-4821",
};

/** Answers `cities` from the fixture and every other call from the queue. */
function stubFetch(...answers: { status?: number; body: unknown }[]) {
  const queue = [...answers];
  const calls: { url: string; init: RequestInit }[] = [];

  const fetchMock = vi.fn(async (url: string | URL, init: RequestInit = {}) => {
    const href = String(url);
    calls.push({ url: href, init });

    const answer = href.endsWith("/cities")
      ? { status: 200, body: CITIES }
      : (queue.shift() ?? { status: 200, body: {} });

    return {
      ok: (answer.status ?? 200) < 400,
      status: answer.status ?? 200,
      json: async () => answer.body,
    } as Response;
  });

  vi.stubGlobal("fetch", fetchMock);
  return calls;
}

function bodyOf(call: { init: RequestInit }) {
  return JSON.parse(String(call.init.body)) as Record<string, never>;
}

beforeEach(() => {
  process.env.BOSTA_API_KEY = "test-bosta-key";
  process.env.BOSTA_BASE_URL = "https://stg-app.bosta.co";
  forgetBostaCities();
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.BOSTA_API_KEY;
  delete process.env.BOSTA_BASE_URL;
});

describe("Bosta driver", () => {
  it("is off until an API key is set", () => {
    expect(isBostaConfigured()).toBe(true);
    delete process.env.BOSTA_API_KEY;
    expect(isBostaConfigured()).toBe(false);
  });

  it("books a cash order with the amount to collect in pounds, not piastres", async () => {
    const calls = stubFetch({ body: { data: { _id: "d_1", trackingNumber: "83412955" } } });

    const shipment = await bostaDriver.createShipment(request);

    const booking = calls.find((call) => call.url.endsWith("/deliveries"));
    expect(booking).toBeDefined();
    const body = bodyOf(booking!);

    // 122000 piastres is 1220 EGP. Sending the piastres would tell the courier
    // to collect a hundred times the price.
    expect(body.cod).toBe(1220);
    expect(body.type).toBe(10);
    expect(body.businessReference).toBe("SW-4821");
    expect(body.receiver).toEqual({
      firstName: "Nour",
      lastName: "Abdel Rahman",
      phone: "01001234567",
      email: "nour@example.com",
    });
    expect(body.dropOffAddress).toMatchObject({ city: "EG-01", firstLine: "12 Road 9" });

    expect(shipment).toEqual({
      provider: "bosta",
      trackingNumber: "83412955",
      shipmentId: "d_1",
      trackingUrl: "https://bosta.co/tracking-shipments?id=83412955",
    });
  });

  it("tells the courier to collect nothing for an order already paid by card", async () => {
    const calls = stubFetch({ body: { data: { _id: "d_2", trackingNumber: "1" } } });

    await bostaDriver.createShipment({ ...request, collectCents: 0 });

    expect(bodyOf(calls.find((call) => call.url.endsWith("/deliveries"))!).cod).toBe(0);
  });

  it("sends the API key bare, the way Bosta expects it", async () => {
    const calls = stubFetch({ body: { data: { trackingNumber: "1" } } });

    await bostaDriver.createShipment(request);

    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("test-bosta-key");
    expect(calls[0].url.startsWith("https://stg-app.bosta.co/api/v0/")).toBe(true);
  });

  it("accepts a delivery returned at the top level as well as under data", async () => {
    stubFetch({ body: { _id: "d_3", trackingNumber: "77777" } });

    const shipment = await bostaDriver.createShipment(request);

    expect(shipment.trackingNumber).toBe("77777");
    expect(shipment.shipmentId).toBe("d_3");
  });

  it("matches a governorate whose name is spelt with El", async () => {
    const calls = stubFetch({ body: { data: { trackingNumber: "1" } } });

    await bostaDriver.createShipment({
      ...request,
      address: { ...address, governorate: "Sharqia" },
    });

    expect(bodyOf(calls.find((call) => call.url.endsWith("/deliveries"))!).dropOffAddress).toMatchObject(
      { city: "EG-06" },
    );
  });

  it("refuses to guess at a governorate Bosta does not cover", async () => {
    stubFetch({ body: { data: { trackingNumber: "1" } } });

    await expect(
      bostaDriver.createShipment({
        ...request,
        address: { ...address, governorate: "South Sinai", city: undefined },
      }),
    ).rejects.toThrow(/no city matching/i);
  });

  it("will not book a parcel with no phone number on it", async () => {
    stubFetch({ body: {} });

    await expect(
      bostaDriver.createShipment({ ...request, address: { ...address, phone: undefined } }),
    ).rejects.toThrow(/phone/i);
  });

  it("passes Bosta's own refusal back to the admin", async () => {
    stubFetch({ status: 400, body: { message: "Business is not allowed to create COD > 5000" } });

    await expect(bostaDriver.createShipment(request)).rejects.toThrow(
      "Business is not allowed to create COD > 5000",
    );
  });

  it("treats a booking with no tracking number as a failure", async () => {
    stubFetch({ body: { data: { _id: "d_4" } } });

    await expect(bostaDriver.createShipment(request)).rejects.toBeInstanceOf(CourierError);
  });

  it("asks for the airway bill by the courier's own id", async () => {
    const calls = stubFetch({ body: { data: "https://bosta.co/awb/d_9.pdf" } });

    const url = await bostaDriver.labelUrl?.("d_9");

    expect(url).toBe("https://bosta.co/awb/d_9.pdf");
    expect(calls[0].url).toBe("https://stg-app.bosta.co/api/v0/deliveries/awb/d_9");
  });

  it("only asks for the city list once", async () => {
    const calls = stubFetch(
      { body: { data: { trackingNumber: "1" } } },
      { body: { data: { trackingNumber: "2" } } },
    );

    await bostaDriver.createShipment(request);
    await bostaDriver.createShipment(request);

    expect(calls.filter((call) => call.url.endsWith("/cities"))).toHaveLength(1);
  });
});
