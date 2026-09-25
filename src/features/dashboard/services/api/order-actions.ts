"use server";

import { revalidatePath } from "next/cache";

import { siteConfig } from "@/config/site";
import {
  sendCancelledNotice,
  sendDeliveredNotice,
  sendFulfilmentNotice,
  sendRefundNotice,
} from "@/lib/email";
import { CourierError, getCourierDriver } from "@/lib/courier";
import { isPaymobConfigured, PaymobError, refundTransaction } from "@/lib/paymob";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isServiceRoleConfigured } from "@/lib/supabase/config";
import { notifyBackInStock } from "@/lib/stock-alerts";
import {
  canCancel,
  canMoveOrder,
  canRefund,
  COURIERS,
  orderStatusMeta,
  readShippingAddress,
  type OrderStatus,
} from "@/features/orders";
import { reconcileOrderNumber } from "@/features/checkout/server";
import { assertCanManageStore } from "./guards.server";
import {
  BULK_ORDER_LIMIT,
  BULK_ORDER_TARGETS,
  orderStatusFormSchema,
  type ActionResult,
  type BulkOrderTarget,
  type BulkOutcome,
  type OrderStatusFormValues,
} from "@/features/dashboard/types";
import type { TablesUpdate } from "@/types/database.types";

function revalidateOrders(id?: string) {
  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/products");
  // "layout" so the customer's own order page refreshes too, not just the list.
  revalidatePath("/account/orders", "layout");
  if (id) revalidatePath(`/dashboard/orders/${id}`);
}

/**
 * Cancels an order and gives its stock back in the same database transaction.
 * Covers an unpaid card order, a confirmed cash order, and a shipped cash order
 * refused at the door. A paid card order is refunded instead — cancelling it
 * would leave the customer's money with us.
 */
export async function cancelOrderAction(id: string, note?: string): Promise<ActionResult> {
  const blocked = await assertCanManageStore();
  if (blocked) return blocked;

  const supabase = await createClient();
  const { data: order } = await supabase
    .from("orders")
    .select("order_number, email, status, payment_method")
    .eq("id", id)
    .maybeSingle();

  if (!order) return { ok: false, error: "That order no longer exists." };
  if (!canCancel(order.status, order.payment_method)) {
    return {
      ok: false,
      error:
        order.payment_method === "card" && order.status !== "pending"
          ? "A paid card order is refunded, not cancelled."
          : "This order can no longer be cancelled.",
    };
  }

  const { data: cancelled, error } = await supabase.rpc("cancel_order", {
    p_order_id: id,
    p_note: note?.trim() || null,
  });

  if (error || !cancelled) return { ok: false, error: "We could not cancel that order." };

  // Its pieces are back on sale; someone may be waiting for exactly these.
  await notifyBackInStock();

  await sendCancelledNotice({
    email: order.email,
    orderNumber: order.order_number,
    reason: note?.trim() || null,
    paid: false,
  });

  revalidateOrders(id);
  return { ok: true };
}

/**
 * Refunds all or part of an order.
 *
 * A card order goes back through Paymob against the captured transaction. A
 * cash order has no card to refund to, so this records the refund the admin
 * has made by hand and tells the customer it is being arranged. Stock is not
 * restocked here: returned goods have to be checked in first, and Restock is
 * its own action for exactly that moment.
 */
export async function refundOrderAction(
  id: string,
  amountCents?: number,
): Promise<ActionResult> {
  const blocked = await assertCanManageStore();
  if (blocked) return blocked;

  if (!isServiceRoleConfigured()) {
    return { ok: false, error: "Refunds are not configured on this deployment." };
  }

  const admin = createAdminClient();

  const { data: order } = await admin
    .from("orders")
    .select(
      "id, order_number, email, status, payment_method, total_cents, refunded_cents, payments(transaction_id, status)",
    )
    .eq("id", id)
    .maybeSingle<{
      id: string;
      order_number: string;
      email: string;
      status: OrderStatus;
      payment_method: "card" | "cod";
      total_cents: number;
      refunded_cents: number;
      payments: { transaction_id: string | null; status: string }[];
    }>();

  if (!order) return { ok: false, error: "That order no longer exists." };

  if (!canRefund(order.status, order.payment_method, order.refunded_cents, order.total_cents)) {
    return {
      ok: false,
      error:
        order.payment_method === "cod" && order.status !== "delivered"
          ? "A cash order is only refunded once the cash has been collected."
          : "There is nothing left to refund on this order.",
    };
  }

  const remaining = order.total_cents - order.refunded_cents;
  const amount = Math.round(amountCents ?? remaining);

  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "Enter an amount to refund." };
  }
  if (amount > remaining) {
    return {
      ok: false,
      error: `At most ${(remaining / 100).toFixed(2)} EGP is left to refund on this order.`,
    };
  }

  let transactionId: string;

  if (order.payment_method === "card") {
    const captured = order.payments.find(
      (payment) => payment.status === "success" && payment.transaction_id,
    );
    if (!captured?.transaction_id) {
      return { ok: false, error: "No captured transaction to refund." };
    }
    if (!isPaymobConfigured()) {
      return { ok: false, error: "Paymob is not configured on this deployment." };
    }

    try {
      await refundTransaction(captured.transaction_id, amount);
    } catch (error) {
      console.error(
        "[dashboard] refund failed",
        error instanceof PaymobError ? error.body : error,
      );
      return { ok: false, error: "Paymob refused the refund. Check the transaction." };
    }
    transactionId = captured.transaction_id;
  } else {
    transactionId = `cash-${order.order_number}`;
  }

  const refundedCents = order.refunded_cents + amount;
  const full = refundedCents >= order.total_cents;

  await admin
    .from("orders")
    .update({
      refunded_cents: refundedCents,
      ...(full ? { status: "refunded" as const, status_note: null } : {}),
    })
    .eq("id", id);

  // Each refund gets its own row. The provider/transaction id pair is unique,
  // so partial refunds are numbered rather than overwriting each other.
  await admin.from("payments").insert({
    order_id: id,
    provider: order.payment_method === "card" ? "paymob" : "cash",
    transaction_id: `${transactionId}-refund-${Date.now()}`,
    amount_cents: -amount,
    status: "refunded",
    hmac_verified: false,
    method: order.payment_method === "card" ? "Refund" : "Cash refund",
    raw: { initiated_from: "dashboard", full },
  });

  await sendRefundNotice({
    email: order.email,
    orderNumber: order.order_number,
    amountCents: amount,
    full,
    method: order.payment_method,
  });

  revalidateOrders(id);
  return { ok: true };
}

/**
 * Puts a refunded order's pieces back on sale once the return has been checked
 * in. The database function is idempotent, so a double click restocks once.
 */
export async function restockOrderAction(id: string): Promise<ActionResult> {
  const blocked = await assertCanManageStore();
  if (blocked) return blocked;

  const supabase = await createClient();
  const { data: order } = await supabase
    .from("orders")
    .select("status, stock_held")
    .eq("id", id)
    .maybeSingle();

  if (!order) return { ok: false, error: "That order no longer exists." };
  if (!order.stock_held) return { ok: false, error: "These pieces are already back in stock." };
  if (order.status !== "refunded") {
    return { ok: false, error: "Restock a return once its refund has gone through." };
  }

  const { data: released, error } = await supabase.rpc("release_order_stock", {
    p_order_id: id,
  });

  if (error || !released) return { ok: false, error: "We could not restock that order." };

  await notifyBackInStock();

  revalidateOrders(id);
  return { ok: true };
}

/**
 * Asks Paymob directly what happened to a card order that is still waiting —
 * the fix for a callback that never arrived. Settles it if Paymob says it was
 * paid; otherwise says so and changes nothing.
 */
export async function checkPaymentAction(id: string): Promise<ActionResult<string>> {
  const blocked = await assertCanManageStore();
  if (blocked) return blocked;

  if (!isServiceRoleConfigured()) {
    return { ok: false, error: "Payment checks are not configured on this deployment." };
  }
  if (!process.env.PAYMOB_API_KEY) {
    return { ok: false, error: "Add PAYMOB_API_KEY to ask Paymob about a payment." };
  }

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("order_number")
    .eq("id", id)
    .maybeSingle();

  if (!order) return { ok: false, error: "That order no longer exists." };

  const outcome = await reconcileOrderNumber(admin, order.order_number);
  revalidateOrders(id);

  const said: Record<string, string> = {
    paid: "Paymob confirms it was paid. The order is now marked paid.",
    "already-applied": "Already recorded as paid.",
    pending: "Paymob still shows the payment in progress.",
    declined: "Paymob shows the payment was declined.",
    refunded: "Paymob shows the payment was refunded.",
    expired: "No payment was made, so the order expired and its stock went back.",
    unknown: "Paymob has no payment for this order yet.",
    skipped: "This order is not waiting on a card payment.",
  };

  return { ok: true, data: said[outcome] ?? "Checked." };
}

/**
 * Moves one order along, with the note and courier details the customer sees.
 *
 * The allowed moves live in `ORDER_STATUS_FLOW`, shared with the customer-facing
 * timeline so both sides describe the same journey. They are checked here and
 * not only in the form: a select is a convenience, never a control.
 *
 * The dated trail is not written here. A trigger on `orders` writes it, so a
 * status change made by the Paymob webhook, or by hand in SQL, is recorded the
 * same way as one made from this screen.
 */
export async function updateOrderStatusAction(
  id: string,
  values: OrderStatusFormValues,
): Promise<ActionResult> {
  const blocked = await assertCanManageStore();
  if (blocked) return blocked;

  const parsed = orderStatusFormSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  const supabase = await createClient();

  const { data: current, error: readError } = await supabase
    .from("orders")
    .select("status, email, order_number, total_cents, fulfilled_at, payment_method")
    .eq("id", id)
    .maybeSingle();

  if (readError) return { ok: false, error: "We could not read that order." };
  if (!current) return { ok: false, error: "That order no longer exists." };

  const next = parsed.data.status;
  const moving = next !== current.status;

  if (moving && !canMoveOrder(current.status, next)) {
    return {
      ok: false,
      error: `An order marked “${orderStatusMeta[current.status].label}” cannot move to “${orderStatusMeta[next].label}”.`,
    };
  }

  const now = new Date().toISOString();
  const patch: TablesUpdate<"orders"> = {
    status: next,
    courier: parsed.data.courier || null,
    tracking_number: parsed.data.trackingNumber || null,
    tracking_url: parsed.data.trackingUrl || null,
  };

  // The note belongs to the transition, so it is only rewritten when there is
  // one. Otherwise correcting a tracking number would silently retitle the last
  // step of the customer's timeline.
  if (moving) patch.status_note = parsed.data.note || null;
  if (next === "fulfilled" && !current.fulfilled_at) patch.fulfilled_at = now;
  if (next === "delivered") patch.delivered_at = now;

  // Matching on the status we just read stops two admins on two screens from
  // moving the same order twice.
  const { data: written, error } = await supabase
    .from("orders")
    .update(patch)
    .eq("id", id)
    .eq("status", current.status)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: "We could not update that order." };
  if (!written) {
    return { ok: false, error: "Someone else moved this order. Reload and try again." };
  }

  if (moving && next === "fulfilled") {
    await sendFulfilmentNotice({
      email: current.email,
      orderNumber: current.order_number,
      totalCents: current.total_cents,
      courier: patch.courier,
      trackingNumber: patch.tracking_number,
      trackingUrl: patch.tracking_url,
    });
  }

  if (moving && next === "delivered") {
    // Delivery is when a cash order's money actually arrives. Recording it as a
    // payment keeps the ledger on the Payments page true for cash as well.
    if (current.payment_method === "cod" && isServiceRoleConfigured()) {
      await createAdminClient().from("payments").insert({
        order_id: id,
        provider: "cash",
        transaction_id: `cash-${current.order_number}`,
        amount_cents: current.total_cents,
        status: "success",
        hmac_verified: false,
        method: "Cash on delivery",
        raw: { collected_by: parsed.data.courier || "courier" },
      });
    }
    await sendDeliveredNotice({ email: current.email, orderNumber: current.order_number });
  }

  revalidateOrders(id);
  return { ok: true };
}

/* ------------------------------------------------------------------- bulk */

type BulkRow = {
  id: string;
  order_number: string;
  email: string;
  status: OrderStatus;
  payment_method: "card" | "cod";
  total_cents: number;
};

/**
 * Moves a selection of orders one step along — the Friday afternoon action,
 * when twenty parcels go to the same courier at once.
 *
 * It refuses to be a shortcut past the rules the single-order form obeys. The
 * same `ORDER_STATUS_FLOW` decides what may move, so nothing here can mark an
 * order paid or refunded; orders in the selection that cannot make the move are
 * left exactly as they were and counted back to the admin. Each update is
 * matched on the status the row was read with, so two admins clicking on two
 * screens move each order once between them.
 *
 * Tracking numbers are deliberately not part of this: a consignment number
 * belongs to one parcel, and a number pasted across twenty orders would send
 * twenty customers to someone else's parcel. The courier is shared, so it can
 * be set here; the numbers are added per order afterwards.
 */
export async function bulkAdvanceOrdersAction(
  ids: string[],
  target: BulkOrderTarget,
  courier?: string,
): Promise<ActionResult<BulkOutcome>> {
  const blocked = await assertCanManageStore();
  if (blocked) return blocked;

  if (!BULK_ORDER_TARGETS.includes(target)) {
    return { ok: false, error: "That is not a move we make in bulk." };
  }

  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return { ok: false, error: "Nothing selected." };
  if (unique.length > BULK_ORDER_LIMIT) {
    return {
      ok: false,
      error: `Bulk actions cover up to ${BULK_ORDER_LIMIT} orders at a time.`,
    };
  }

  const courierName = courier?.trim() || null;
  if (courierName && !COURIERS.some((entry) => entry.name === courierName)) {
    return { ok: false, error: "Pick a courier from the list." };
  }

  const supabase = await createClient();
  const { data: rows, error: readError } = await supabase
    .from("orders")
    .select("id, order_number, email, status, payment_method, total_cents")
    .in("id", unique)
    .returns<BulkRow[]>();

  if (readError) return { ok: false, error: "We could not read those orders." };

  const movable = (rows ?? []).filter((row) => canMoveOrder(row.status, target));
  if (movable.length === 0) {
    return {
      ok: false,
      error:
        target === "fulfilled"
          ? "None of those orders are waiting to be shipped."
          : "None of those orders are out for delivery.",
    };
  }

  const now = new Date().toISOString();

  // One statement per status the selection came from, each matched on that
  // status so a row someone else has already moved is left alone.
  const byStatus = new Map<OrderStatus, string[]>();
  for (const row of movable) {
    byStatus.set(row.status, [...(byStatus.get(row.status) ?? []), row.id]);
  }

  const written = new Set<string>();

  for (const [from, groupIds] of byStatus) {
    const patch: TablesUpdate<"orders"> = { status: target, status_note: null };
    if (courierName) patch.courier = courierName;
    if (target === "fulfilled") patch.fulfilled_at = now;
    if (target === "delivered") patch.delivered_at = now;

    const { data: updated, error } = await supabase
      .from("orders")
      .update(patch)
      .in("id", groupIds)
      .eq("status", from)
      .select("id");

    if (error) {
      console.error("[dashboard] bulk order update failed", error);
      continue;
    }
    for (const row of updated ?? []) written.add(row.id);
  }

  const moved = movable.filter((row) => written.has(row.id));

  // Cash arrives at the door, so a delivered cash order is also a payment. The
  // ledger on the Payments page has to agree with the parcel.
  const cashCollected = moved.filter((row) => row.payment_method === "cod");
  if (target === "delivered" && cashCollected.length > 0 && isServiceRoleConfigured()) {
    await createAdminClient()
      .from("payments")
      .insert(
        cashCollected.map((row) => ({
          order_id: row.id,
          provider: "cash",
          transaction_id: `cash-${row.order_number}`,
          amount_cents: row.total_cents,
          status: "success",
          hmac_verified: false,
          method: "Cash on delivery",
          raw: { collected_by: courierName ?? "courier", bulk: true },
        })),
      );
  }

  // One slow mailbox must not hold up the rest, and an email that bounces must
  // not undo a parcel that really did ship.
  await Promise.allSettled(
    moved.map((row) =>
      target === "fulfilled"
        ? sendFulfilmentNotice({
            email: row.email,
            orderNumber: row.order_number,
            totalCents: row.total_cents,
            courier: courierName,
          })
        : sendDeliveredNotice({ email: row.email, orderNumber: row.order_number }),
    ),
  );

  for (const row of moved) revalidatePath(`/dashboard/orders/${row.id}`);
  revalidateOrders();

  return {
    ok: true,
    data: { moved: moved.length, skipped: unique.length - moved.length },
  };
}

/* --------------------------------------------------------------- couriers */

/**
 * Books the parcel with the courier and marks the order shipped in one go.
 *
 * This is the manual "mark shipped" flow with the typing taken out: the courier
 * hands back the consignment number instead of the admin reading it off a label,
 * and everything after that — the status move, the timeline entry, the customer's
 * email with the tracking link — is the same code path as before. That is the
 * point. A courier integration that quietly invented its own way of shipping an
 * order would be two systems to keep in step.
 *
 * The order is only moved after the courier has confirmed. If Bosta refuses,
 * nothing about the order changes and the admin reads the refusal.
 */
export async function bookShipmentAction(id: string): Promise<ActionResult<string>> {
  const blocked = await assertCanManageStore();
  if (blocked) return blocked;

  const driver = getCourierDriver();
  if (!driver) {
    return { ok: false, error: "No courier account is connected on this deployment." };
  }

  const supabase = await createClient();
  const { data: order } = await supabase
    .from("orders")
    .select(
      `id, order_number, email, status, payment_method, total_cents, refunded_cents,
       shipping_address, shipment_id, items:order_items(quantity)`,
    )
    .eq("id", id)
    .maybeSingle<{
      id: string;
      order_number: string;
      email: string;
      status: OrderStatus;
      payment_method: "card" | "cod";
      total_cents: number;
      refunded_cents: number;
      shipping_address: unknown;
      shipment_id: string | null;
      items: { quantity: number }[];
    }>();

  if (!order) return { ok: false, error: "That order no longer exists." };
  if (order.shipment_id) {
    return { ok: false, error: "This order is already booked with the courier." };
  }
  if (!canMoveOrder(order.status, "fulfilled")) {
    return {
      ok: false,
      error: `An order marked “${orderStatusMeta[order.status].label}” is not ready to ship.`,
    };
  }

  const address = readShippingAddress(order.shipping_address);
  const itemsCount = order.items.reduce((count, item) => count + item.quantity, 0);

  let shipment;
  try {
    shipment = await driver.createShipment({
      orderNumber: order.order_number,
      address,
      itemsCount,
      // Cash orders only. A card order is paid; asking the courier to collect
      // again would charge the customer twice.
      collectCents:
        order.payment_method === "cod"
          ? Math.max(order.total_cents - order.refunded_cents, 0)
          : 0,
      notes: `${siteConfig.name} ${order.order_number}`,
    });
  } catch (error) {
    if (error instanceof CourierError) return { ok: false, error: error.message };
    console.error("[dashboard] courier booking failed", error);
    return { ok: false, error: "We could not reach the courier. Try again in a moment." };
  }

  const { data: written, error } = await supabase
    .from("orders")
    .update({
      status: "fulfilled",
      fulfilled_at: new Date().toISOString(),
      courier: driver.label,
      tracking_number: shipment.trackingNumber,
      tracking_url: shipment.trackingUrl,
      shipment_provider: shipment.provider,
      shipment_id: shipment.shipmentId,
      status_note: null,
    })
    .eq("id", id)
    .eq("status", order.status)
    .select("id")
    .maybeSingle();

  if (error || !written) {
    // The parcel is genuinely booked, so the number must not be lost with the
    // failed write. It is the one thing the admin needs to fix this by hand.
    console.error("[dashboard] shipment booked but order not updated", {
      order: order.order_number,
      tracking: shipment.trackingNumber,
      error,
    });
    return {
      ok: false,
      error: `The courier booked ${shipment.trackingNumber}, but the order did not update. Add it by hand.`,
    };
  }

  await sendFulfilmentNotice({
    email: order.email,
    orderNumber: order.order_number,
    totalCents: order.total_cents,
    courier: driver.label,
    trackingNumber: shipment.trackingNumber,
    trackingUrl: shipment.trackingUrl,
  });

  revalidateOrders(id);
  return { ok: true, data: shipment.trackingNumber };
}

/**
 * The courier's own airway bill for a booked parcel — the label that goes on
 * the box. Returns the link rather than the PDF: it is the courier's document,
 * served from the courier, and proxying it would only add a way to fail.
 */
export async function shipmentLabelAction(id: string): Promise<ActionResult<string>> {
  const blocked = await assertCanManageStore();
  if (blocked) return blocked;

  const driver = getCourierDriver();
  if (!driver?.labelUrl) {
    return { ok: false, error: "This courier does not print labels from here." };
  }

  const supabase = await createClient();
  const { data: order } = await supabase
    .from("orders")
    .select("shipment_id, shipment_provider")
    .eq("id", id)
    .maybeSingle();

  if (!order?.shipment_id) {
    return { ok: false, error: "This order has not been booked with the courier." };
  }
  if (order.shipment_provider && order.shipment_provider !== driver.provider) {
    return { ok: false, error: "This order was booked with a different courier." };
  }

  try {
    const url = await driver.labelUrl(order.shipment_id);
    if (!url) return { ok: false, error: "The courier did not return a label." };
    return { ok: true, data: url };
  } catch (error) {
    if (error instanceof CourierError) return { ok: false, error: error.message };
    console.error("[dashboard] label fetch failed", error);
    return { ok: false, error: "We could not reach the courier." };
  }
}
