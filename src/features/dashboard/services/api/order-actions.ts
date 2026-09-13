"use server";

import { revalidatePath } from "next/cache";

import { sendFulfilmentNotice } from "@/lib/email";
import { isPaymobConfigured, PaymobError, refundTransaction } from "@/lib/paymob";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isServiceRoleConfigured } from "@/lib/supabase/config";
import { canMoveOrder, orderStatusMeta } from "@/features/orders";
import { assertCanManageStore } from "./guards.server";
import {
  orderStatusFormSchema,
  type ActionResult,
  type OrderStatusFormValues,
} from "@/features/dashboard/types";
import type { TablesUpdate } from "@/types/database.types";

function revalidateOrders(id?: string) {
  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard");
  // "layout" so the customer's own order page refreshes too, not just the list.
  revalidatePath("/account/orders", "layout");
  if (id) revalidatePath(`/dashboard/orders/${id}`);
}

export async function cancelOrderAction(id: string): Promise<ActionResult> {
  const blocked = await assertCanManageStore();
  if (blocked) return blocked;

  const supabase = await createClient();
  const { error } = await supabase
    .from("orders")
    .update({ status: "cancelled" })
    .eq("id", id)
    .eq("status", "pending");

  if (error) return { ok: false, error: "We could not cancel that order." };

  revalidateOrders(id);
  return { ok: true };
}

/**
 * Refunds through Paymob, then records it. Stock is deliberately not restocked
 * automatically — returned goods have to come back and be checked first.
 */
export async function refundOrderAction(id: string): Promise<ActionResult> {
  const blocked = await assertCanManageStore();
  if (blocked) return blocked;

  if (!isServiceRoleConfigured()) {
    return { ok: false, error: "Refunds are not configured on this deployment." };
  }

  const admin = createAdminClient();

  const { data: order } = await admin
    .from("orders")
    .select("id, order_number, status, total_cents, payments(transaction_id, status)")
    .eq("id", id)
    .maybeSingle<{
      id: string;
      order_number: string;
      status: string;
      total_cents: number;
      payments: { transaction_id: string | null; status: string }[];
    }>();

  if (!order) return { ok: false, error: "That order no longer exists." };
  // Delivered is in here on purpose: a return after delivery is the commonest
  // reason to refund at all.
  if (!["paid", "fulfilled", "delivered"].includes(order.status)) {
    return { ok: false, error: "Only a paid order can be refunded." };
  }

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
    await refundTransaction(captured.transaction_id, order.total_cents);
  } catch (error) {
    console.error(
      "[dashboard] refund failed",
      error instanceof PaymobError ? error.body : error,
    );
    return { ok: false, error: "Paymob refused the refund. Check the transaction." };
  }

  await admin.from("orders").update({ status: "refunded" }).eq("id", id);
  await admin.from("payments").insert({
    order_id: id,
    provider: "paymob",
    transaction_id: `${captured.transaction_id}-refund`,
    amount_cents: -order.total_cents,
    status: "refunded",
    hmac_verified: false,
    method: "Refund",
    raw: { initiated_from: "dashboard" },
  });

  revalidateOrders(id);
  return { ok: true };
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
    .select("status, email, order_number, total_cents, fulfilled_at")
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

  revalidateOrders(id);
  return { ok: true };
}
