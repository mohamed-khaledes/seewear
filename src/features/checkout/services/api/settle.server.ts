import "server-only";

import type { Json } from "@/types/database.types";
import type { PaymobTransaction } from "@/lib/paymob";
import type { SupabaseAdminClient } from "@/lib/supabase/admin";
import { sendConfirmationForOrder } from "./confirmation.server";

export type SettledOrder = {
  id: string;
  order_number: string;
  total_cents: number;
  refunded_cents?: number;
};

export type SettleOutcome = "paid" | "already-applied" | "refunded" | "pending" | "declined";

/** How we learned about the transaction; recorded on the payment row. */
export type TransactionSource = "callback" | "inquiry";

function describeMethod(transaction: PaymobTransaction): string {
  const source = transaction.source_data;
  if (!source) return "Card";
  const type = source.sub_type ?? source.type ?? "Card";
  const pan = source.pan;
  return pan ? `${type} •••• ${String(pan).slice(-4)}` : String(type);
}

/**
 * Applies one Paymob transaction to one of our orders. The single code path
 * for both the HMAC-verified callback and the reconciliation inquiry, so the
 * two can never disagree about what a successful payment means.
 *
 * Idempotent on every step: the payment row upserts on the provider's
 * transaction id, `apply_paid_order` refuses to apply twice, and the
 * confirmation email is only sent when that call actually changed something.
 */
export async function settleTransaction(
  admin: SupabaseAdminClient,
  order: SettledOrder,
  transaction: PaymobTransaction,
  source: TransactionSource,
): Promise<SettleOutcome> {
  const succeeded = transaction.success === true && transaction.pending !== true;
  const refunded = transaction.is_refunded === true;

  const status = refunded
    ? "refunded"
    : succeeded
      ? "success"
      : transaction.pending === true
        ? "pending"
        : "declined";

  const { error: paymentError } = await admin.from("payments").upsert(
    {
      order_id: order.id,
      provider: "paymob",
      paymob_order_id: String(transaction.order?.id ?? ""),
      transaction_id: String(transaction.id),
      method: describeMethod(transaction),
      amount_cents: Number(transaction.amount_cents) || order.total_cents,
      status,
      // Only a callback carries an HMAC. An inquiry is trusted because we asked
      // Paymob over TLS with our own key — but it is recorded honestly as not
      // HMAC-verified, and labelled as an inquiry in `raw`.
      hmac_verified: source === "callback",
      raw: { source, transaction } as unknown as Json,
    },
    { onConflict: "provider,transaction_id" },
  );

  if (paymentError) throw paymentError;

  if (refunded) {
    // Paymob reports the running total refunded. Never lower what we already
    // recorded — a dashboard refund may have landed first.
    const reported = Number(transaction.refunded_amount_cents ?? 0);
    const known = order.refunded_cents ?? 0;
    const refundedCents = Math.min(Math.max(reported, known), order.total_cents);

    await admin
      .from("orders")
      .update({
        refunded_cents: refundedCents,
        ...(refundedCents >= order.total_cents ? { status: "refunded" as const } : {}),
      })
      .eq("id", order.id);

    return "refunded";
  }

  if (!succeeded) {
    return transaction.pending === true ? "pending" : "declined";
  }

  const { data: applied, error: applyError } = await admin.rpc("apply_paid_order", {
    p_order_id: order.id,
  });

  if (applyError) throw applyError;
  if (!applied) return "already-applied";

  await sendConfirmationForOrder(admin, order.id);
  return "paid";
}
