import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isServiceRoleConfigured, isSupabaseConfigured } from "@/lib/supabase/config";
import { siteConfig } from "@/config/site";
import {
  readShippingAddress,
  trackOrderSchema,
  type OrderDetail,
  type OrderListItem,
  type TrackedOrder,
  type TrackOrderResult,
  type TrackOrderValues,
} from "@/features/orders/types";
import type { OrderStatus } from "@/features/orders/services/utils/status";

const LIST_COLUMNS = `
  id, order_number, status, total_cents, created_at, email,
  items:order_items(name, color, size, quantity, image_url)
`;

const DETAIL_COLUMNS = `
  *,
  items:order_items(*),
  payments:payments(id, status, method, amount_cents, created_at, transaction_id, hmac_verified),
  events:order_events(*)
`;

/** Oldest first — a timeline reads downwards. */
function byOldest<T extends { created_at: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at));
}

/** RLS scopes this to the signed-in customer. */
export async function getMyOrders(): Promise<OrderListItem[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select(LIST_COLUMNS)
    .order("created_at", { ascending: false })
    .returns<OrderListItem[]>();

  if (error) throw error;
  return data ?? [];
}

export async function getMyOrder(orderNumber: string): Promise<OrderDetail | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select(DETAIL_COLUMNS)
    .eq("order_number", orderNumber)
    .maybeSingle<OrderDetail>();

  if (error) throw error;
  if (!data) return null;

  return { ...data, events: byOldest(data.events) };
}

/**
 * Looks up one order for someone who is not signed in.
 *
 * Guest orders have no `user_id`, so RLS hides them from every browser session
 * — which is right, and would otherwise leave a guest with no way to see where
 * their parcel is. The order number alone is not a secret: it comes from a
 * sequence, so SW-4822 follows SW-4821. The email is the proof, and both have
 * to match before anything comes back. Runs with the service-role key, the same
 * one that wrote the order at checkout.
 */
export async function trackOrder(values: TrackOrderValues): Promise<TrackOrderResult> {
  const parsed = trackOrderSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check both fields." };
  }

  if (!isServiceRoleConfigured()) {
    return {
      ok: false,
      error: `Order lookup is not connected on this deployment. Email ${siteConfig.support.email} and we will find it.`,
    };
  }

  const orderNumber = parsed.data.orderNumber.toUpperCase().replace(/\s+/g, "");
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("orders")
    .select(
      `order_number, status, created_at, total_cents, courier, tracking_number,
       tracking_url, status_note, shipping_address,
       items:order_items(name, slug, color, size, quantity, image_url),
       events:order_events(status, note, created_at)`,
    )
    .eq("order_number", orderNumber)
    // citext, so the comparison is already case-insensitive.
    .eq("email", parsed.data.email.trim())
    .maybeSingle();

  if (error) {
    console.error("[orders] tracking lookup failed", error);
    return { ok: false, error: "We could not reach the order just now. Try again shortly." };
  }

  // One message for "wrong number" and "wrong email" on purpose: a different
  // answer for each would confirm which order numbers exist.
  if (!data) {
    return {
      ok: false,
      error: "No order matches that number and email. Check both against your confirmation.",
    };
  }

  const address = readShippingAddress(data.shipping_address);

  const order: TrackedOrder = {
    orderNumber: data.order_number,
    status: data.status,
    createdAt: data.created_at,
    totalCents: data.total_cents,
    courier: data.courier,
    trackingNumber: data.tracking_number,
    trackingUrl: data.tracking_url,
    statusNote: data.status_note,
    shippingTo: [address.city, address.governorate].filter(Boolean).join(", ") || null,
    items: data.items.map((item) => ({
      name: item.name,
      slug: item.slug,
      color: item.color,
      size: item.size,
      quantity: item.quantity,
      imageUrl: item.image_url,
    })),
    events: byOldest(data.events).map((event) => ({
      status: event.status as OrderStatus,
      note: event.note,
      createdAt: event.created_at,
    })),
  };

  return { ok: true, order };
}
