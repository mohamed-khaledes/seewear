import "server-only";

import {
  CourierError,
  type CourierDriver,
  type Shipment,
  type ShipmentRequest,
} from "./types";

/**
 * Bosta, the courier most Egyptian stores of this size actually use.
 *
 * Written against Bosta's own published SDK (`bostaapp/bosta-nodejs`): the
 * `/api/v0` prefix, the API key sent bare in `Authorization` with no `Bearer`,
 * and the delivery body it builds. Two details are worth naming because they
 * are expensive to get wrong:
 *
 *   - `cod` is in **pounds**, not piastres. The store counts in piastres
 *     everywhere else, so the conversion happens here, once, at the boundary.
 *   - type `10` is a plain forward delivery. Cash on delivery is not a
 *     different type; it is a forward delivery with a `cod` amount on it.
 *
 * The base URL is configurable so the whole flow can be rehearsed against
 * Bosta's staging host before a real parcel is booked.
 */

const DEFAULT_BASE_URL = "https://app.bosta.co";
const PACKAGE_DELIVERY = 10;

export function isBostaConfigured(): boolean {
  return Boolean(process.env.BOSTA_API_KEY);
}

function baseUrl(): string {
  return (process.env.BOSTA_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
}

async function call<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  const apiKey = process.env.BOSTA_API_KEY;
  if (!apiKey) throw new CourierError("Bosta is not configured on this deployment.");

  let response: Response;
  try {
    response = await fetch(`${baseUrl()}/api/v0/${path}`, {
      method,
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
        "X-Requested-By": "seewear",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      // A courier that has gone quiet must not hold a dashboard request open.
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });
  } catch (error) {
    throw new CourierError("Bosta did not answer. Try again in a moment.", error);
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    // Bosta's own message is nearly always the thing that has to be fixed —
    // an uncovered area, a phone number it will not take — so it is carried
    // through to the admin rather than replaced with something reassuring.
    const message =
      (typeof payload === "object" && payload !== null && "message" in payload
        ? String((payload as { message: unknown }).message)
        : "") || `Bosta refused the booking (HTTP ${response.status}).`;
    throw new CourierError(message, payload);
  }

  return payload as T;
}

/**
 * Bosta addresses a parcel by its own city id, not by a governorate name, so
 * the list is fetched and matched once per server instance. It changes about
 * never, and a missing match is reported rather than guessed: a parcel sent to
 * the wrong city is worse than a booking that did not happen.
 */
type BostaCity = { _id?: string; name?: string; nameAr?: string; code?: string };

let cityCache: BostaCity[] | null = null;

export function forgetBostaCities() {
  cityCache = null;
}

async function cities(): Promise<BostaCity[]> {
  if (cityCache) return cityCache;

  const payload = await call<{ data?: BostaCity[] } | BostaCity[]>("GET", "cities");
  const list = Array.isArray(payload) ? payload : (payload?.data ?? []);
  cityCache = list;
  return list;
}

const normalise = (value: string) =>
  value
    .toLowerCase()
    .replace(/^(el|al)[\s-]+/, "")
    .replace(/[^a-z؀-ۿ]+/g, "");

async function cityIdFor(governorate: string | undefined, city: string | undefined) {
  const wanted = [governorate, city].filter(Boolean).map((value) => normalise(String(value)));
  if (wanted.length === 0) {
    throw new CourierError("This order has no governorate to ship to.");
  }

  const list = await cities();
  for (const target of wanted) {
    const match = list.find((entry) =>
      [entry.name, entry.nameAr].some((name) => name && normalise(name) === target),
    );
    if (match?._id) return match._id;
  }

  throw new CourierError(
    `Bosta has no city matching “${governorate ?? city}”. Book this one by hand.`,
  );
}

function splitName(fullName: string | undefined) {
  const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "Customer", lastName: "-" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "-" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

/** Bosta's own tracking page, which is what the customer is sent. */
export function bostaTrackingUrl(trackingNumber: string): string {
  return `https://bosta.co/tracking-shipments?id=${encodeURIComponent(trackingNumber)}`;
}

type CreatedDelivery = { _id?: string; trackingNumber?: string };

export const bostaDriver: CourierDriver = {
  provider: "bosta",
  label: "Bosta",

  async createShipment(request: ShipmentRequest): Promise<Shipment> {
    const { address } = request;

    if (!address.phone) {
      throw new CourierError("This order has no phone number, and Bosta needs one.");
    }

    const cityId = await cityIdFor(address.governorate, address.city);
    const { firstName, lastName } = splitName(address.fullName);

    const payload = await call<{ data?: CreatedDelivery } & CreatedDelivery>(
      "POST",
      "deliveries",
      {
        type: PACKAGE_DELIVERY,
        specs: {
          size: request.itemsCount > 3 ? "MEDIUM" : "SMALL",
          packageDetails: {
            itemsCount: request.itemsCount,
            description: `Clothing — order ${request.orderNumber}`,
          },
        },
        // Pounds, and only for a parcel that still has to be paid for.
        cod: Math.round(request.collectCents / 100),
        dropOffAddress: {
          city: cityId,
          firstLine: address.line1 ?? "",
          secondLine: address.line2 ?? "",
        },
        businessReference: request.orderNumber,
        receiver: {
          firstName,
          lastName,
          phone: address.phone,
          ...(address.email ? { email: address.email } : {}),
        },
        ...(request.notes ? { notes: request.notes } : {}),
      },
    );

    // The SDK reads the created delivery straight off the body; the API wraps
    // it in `data` in places. Accept either rather than depend on which.
    const created = payload?.data ?? payload;
    const trackingNumber = created?.trackingNumber;

    if (!trackingNumber) {
      throw new CourierError("Bosta accepted the booking but gave no tracking number.", payload);
    }

    return {
      provider: "bosta",
      trackingNumber,
      shipmentId: created?._id ?? null,
      trackingUrl: bostaTrackingUrl(trackingNumber),
    };
  },

  async labelUrl(shipmentId: string) {
    const payload = await call<{ data?: string } | string>("GET", `deliveries/awb/${shipmentId}`);
    if (typeof payload === "string") return payload;
    return typeof payload?.data === "string" ? payload.data : null;
  },
};
