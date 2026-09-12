"use server";

import { revalidatePath } from "next/cache";

import { sendFulfilmentNotice } from "@/lib/email";
import { isPaymobConfigured, PaymobError, refundTransaction } from "@/lib/paymob";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isServiceRoleConfigured } from "@/lib/supabase/config";
import { assertCanManageStore } from "./guards.server";
import type { ActionResult } from "@/features/dashboard/types";

function revalidateOrders(id?: string) {
  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard");
  revalidatePath("/account/orders");
  if (id) revalidatePath(`/dashboard/orders/${id}`);
}

export async function markOrderFulfilledAction(id: string): Promise<ActionResult> {
  const blocked = await assertCanManageStore();
  if (blocked) return blocked;

  const supabase = await createClient();

  const { data: order, error } = await supabase
    .from("orders")
    .update({ status: "fulfilled", fulfilled_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "paid")
    .select("order_number, email, total_cents")
    .maybeSingle();

  if (error) return { ok: false, error: "We could not update that order." };
  if (!order) {
    return { ok: false, error: "Only paid orders can be marked fulfilled." };
  }

  await sendFulfilmentNotice({
    email: order.email,
    orderNumber: order.order_number,
    totalCents: order.total_cents,
  });

  revalidateOrders(id);
  return { ok: true };
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
  if (order.status !== "paid" && order.status !== "fulfilled") {
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
