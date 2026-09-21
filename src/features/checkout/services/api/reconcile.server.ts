import "server-only";

import { inquireByOrderNumber, isInquiryConfigured, PaymobError } from "@/lib/paymob";
import type { SupabaseAdminClient } from "@/lib/supabase/admin";
import { settleTransaction, type SettleOutcome } from "./settle.server";

/** A card checkout younger than this may still be on Paymob's page. */
const STILL_PAYING_MINUTES = 10;
/** After this long unpaid, an order's stock goes back on sale. */
const EXPIRE_AFTER_MINUTES = 60;
/** How far back to look for expired orders that turn out to have been paid. */
const RESCUE_WINDOW_HOURS = 48;

type Candidate = {
  id: string;
  order_number: string;
  total_cents: number;
  refunded_cents: number;
  status: string;
  created_at: string;
};

export type ReconcileOutcome = SettleOutcome | "expired" | "unknown" | "skipped";

function minutesSince(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / 60_000;
}

/**
 * Settles one order against what Paymob says, and expires it if it is both old
 * enough and unpaid. Never trusts anything the browser sent.
 */
export async function reconcileOrder(
  admin: SupabaseAdminClient,
  order: Candidate,
): Promise<ReconcileOutcome> {
  const age = minutesSince(order.created_at);

  if (isInquiryConfigured()) {
    let transaction;
    try {
      transaction = await inquireByOrderNumber(order.order_number);
    } catch (error) {
      console.error(
        `[reconcile] inquiry failed for ${order.order_number}`,
        error instanceof PaymobError ? error.body : error,
      );
      return "skipped";
    }

    if (transaction) {
      const outcome = await settleTransaction(admin, order, transaction, "inquiry");
      if (outcome !== "declined" && outcome !== "pending") return outcome;
    }

    if (order.status === "pending" && age >= EXPIRE_AFTER_MINUTES) {
      const { data } = await admin.rpc("expire_order", { p_order_id: order.id });
      return data ? "expired" : "unknown";
    }
    return transaction ? "pending" : "unknown";
  }

  // Without inquiry credentials an abandoned checkout and a paid one whose
  // callback was lost look the same from here. Stock still goes back after an
  // hour: a callback that arrives later completes the expired order anyway.
  if (order.status === "pending" && age >= EXPIRE_AFTER_MINUTES) {
    const { data } = await admin.rpc("expire_order", { p_order_id: order.id });
    return data ? "expired" : "unknown";
  }
  return "skipped";
}

export async function reconcileOrderNumber(
  admin: SupabaseAdminClient,
  orderNumber: string,
): Promise<ReconcileOutcome> {
  const { data } = await admin
    .from("orders")
    .select(
      "id, order_number, total_cents, refunded_cents, status, created_at, payment_method, expired_at",
    )
    .eq("order_number", orderNumber)
    .maybeSingle();

  if (!data || data.payment_method !== "card") return "skipped";
  // Pending, or expired by the job. A cancellation an admin chose is final.
  const rescuable = data.status === "cancelled" && data.expired_at !== null;
  if (data.status !== "pending" && !rescuable) return "skipped";
  return reconcileOrder(admin, data);
}

export type ReconcileReport = Record<ReconcileOutcome, number> & { checked: number };

/**
 * The scheduled sweep. Looks at every card order that is still waiting, plus
 * recently expired ones — an expired order that Paymob says was paid is the
 * exact case this job exists for — and cleans out old rate-limit counters.
 */
export async function reconcilePendingOrders(
  admin: SupabaseAdminClient,
  limit = 100,
): Promise<ReconcileReport> {
  const report: ReconcileReport = {
    checked: 0,
    paid: 0,
    "already-applied": 0,
    refunded: 0,
    pending: 0,
    declined: 0,
    expired: 0,
    unknown: 0,
    skipped: 0,
  };

  const youngest = new Date(Date.now() - STILL_PAYING_MINUTES * 60_000).toISOString();
  const rescueFrom = new Date(Date.now() - RESCUE_WINDOW_HOURS * 3_600_000).toISOString();
  const columns = "id, order_number, total_cents, refunded_cents, status, created_at";

  const [pending, expired] = await Promise.all([
    admin
      .from("orders")
      .select(columns)
      .eq("status", "pending")
      .eq("payment_method", "card")
      .lt("created_at", youngest)
      .order("created_at")
      .limit(limit),
    isInquiryConfigured()
      ? admin
          .from("orders")
          .select(columns)
          .eq("status", "cancelled")
          .eq("payment_method", "card")
          .gte("expired_at", rescueFrom)
          .order("expired_at")
          .limit(limit)
      : Promise.resolve({ data: [] as Candidate[] }),
  ]);

  for (const order of [...(pending.data ?? []), ...(expired.data ?? [])]) {
    report.checked += 1;
    try {
      report[await reconcileOrder(admin, order)] += 1;
    } catch (error) {
      console.error(`[reconcile] ${order.order_number} failed`, error);
      report.skipped += 1;
    }
  }

  await admin
    .from("rate_limits")
    .delete()
    .lt("window_start", new Date(Date.now() - 86_400_000).toISOString());

  return report;
}

/**
 * The cheap half of the sweep, run inline at checkout: give back stock held by
 * card checkouts abandoned more than an hour ago, without calling Paymob. A
 * payment that still turns up for one of these completes it anyway —
 * `apply_paid_order` accepts an expired order — so nothing is lost by not
 * asking first.
 */
export async function expireAbandonedCheckouts(admin: SupabaseAdminClient): Promise<void> {
  const cutoff = new Date(Date.now() - EXPIRE_AFTER_MINUTES * 60_000).toISOString();
  const { data } = await admin
    .from("orders")
    .select("id")
    .eq("status", "pending")
    .eq("payment_method", "card")
    .lt("created_at", cutoff)
    .limit(25);

  for (const order of data ?? []) {
    await admin.rpc("expire_order", { p_order_id: order.id });
  }
}
