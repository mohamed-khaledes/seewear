import "server-only";

import { bostaDriver, isBostaConfigured } from "./bosta";
import type { CourierDriver } from "./types";

export { CourierError } from "./types";
export type { CourierDriver, Shipment, ShipmentAddress, ShipmentRequest } from "./types";
export { bostaDriver, bostaTrackingUrl, forgetBostaCities, isBostaConfigured } from "./bosta";

/**
 * The courier this deployment books with, or nothing.
 *
 * Nothing is a first-class answer: the dashboard has always let an admin type
 * a consignment number in by hand, and that stays the whole feature for a store
 * whose courier has no API, or which has not signed up for one yet. A driver
 * only ever adds a button.
 */
export function getCourierDriver(): CourierDriver | null {
  if (isBostaConfigured()) return bostaDriver;
  return null;
}

export function isCourierConfigured(): boolean {
  return getCourierDriver() !== null;
}
