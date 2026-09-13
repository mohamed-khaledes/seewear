"use server";

import { trackOrder } from "./orders.server";
import type { TrackOrderResult, TrackOrderValues } from "@/features/orders/types";

/**
 * The browser's way into `trackOrder`. The lookup itself is marked
 * `server-only`, so a client component cannot import it directly.
 */
export async function trackOrderAction(
  values: TrackOrderValues,
): Promise<TrackOrderResult> {
  return trackOrder(values);
}
