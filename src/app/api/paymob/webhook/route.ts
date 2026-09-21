import { NextResponse, type NextRequest } from "next/server";

import { siteConfig } from "@/config/site";
import { isInquiryConfigured, verifyTransactionHmac } from "@/lib/paymob";
import type { PaymobCallbackBody, PaymobTransaction } from "@/lib/paymob";
import { createAdminClient, type SupabaseAdminClient } from "@/lib/supabase/admin";
import { isServiceRoleConfigured } from "@/lib/supabase/config";
import {
  reconcileOrderNumber,
  settleTransaction,
  type SettledOrder,
} from "@/features/checkout/server";

export const dynamic = "force-dynamic";

/**
 * Where an order becomes `paid` when Paymob tells us so.
 *
 * Paymob posts the transaction here and also sends the customer's browser here
 * on redirect. The POST is the trust boundary: the HMAC is recomputed from the
 * transaction fields and nothing is written unless it matches. What a verified
 * transaction means is decided in `settleTransaction`, shared with the
 * reconciliation job so the two can never disagree.
 */
export async function POST(request: NextRequest) {
  if (!isServiceRoleConfigured()) {
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }

  let body: PaymobCallbackBody;
  try {
    body = (await request.json()) as PaymobCallbackBody;
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const transaction = body.obj;
  if (!transaction || typeof transaction !== "object") {
    return NextResponse.json({ error: "no transaction" }, { status: 400 });
  }

  const receivedHmac = request.nextUrl.searchParams.get("hmac") ?? body.hmac ?? null;

  if (!verifyTransactionHmac(transaction, receivedHmac)) {
    console.warn(
      `[paymob] rejected callback for transaction ${transaction.id}: HMAC mismatch`,
    );
    return NextResponse.json({ error: "hmac mismatch" }, { status: 401 });
  }

  const admin = createAdminClient();
  const order = await findOrder(admin, transaction);

  if (!order) {
    console.warn(`[paymob] no order for transaction ${transaction.id}`);
    // 200 so Paymob stops retrying a callback we can never resolve.
    return NextResponse.json({ received: true, matched: false });
  }

  try {
    const outcome = await settleTransaction(admin, order, transaction, "callback");
    if (outcome === "declined") {
      console.warn(`[paymob] transaction ${transaction.id} declined for ${order.order_number}`);
    }
    return NextResponse.json({ received: true, status: outcome });
  } catch (error) {
    console.error("[paymob] could not settle transaction", error);
    // 500 so Paymob retries: every step of settling is idempotent.
    return NextResponse.json({ error: "could not apply transaction" }, { status: 500 });
  }
}

/**
 * The customer's browser lands here after paying. The database truth comes from
 * the POST above — this only picks a page.
 *
 * With inquiry credentials it also asks Paymob directly before redirecting. If
 * the callback is late or lost, that is the difference between the shopper
 * seeing "paid" and seeing "confirming payment" forever. The redirect's own
 * `success` parameter is never trusted for anything but the choice of page.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const success = params.get("success") === "true";
  const orderNumber =
    params.get("merchant_order_id") ?? params.get("special_reference") ?? "";

  if (orderNumber && isServiceRoleConfigured() && isInquiryConfigured()) {
    await Promise.race([
      reconcileOrderNumber(createAdminClient(), orderNumber).catch((error) =>
        console.error("[paymob] redirect reconciliation failed", error),
      ),
      // Never hold the shopper on a blank page waiting for Paymob.
      new Promise((resolve) => setTimeout(resolve, 4000)),
    ]);
  }

  const destination = new URL(
    success ? "/checkout/success" : "/checkout/failed",
    siteConfig.url,
  );

  if (orderNumber) destination.searchParams.set("order", orderNumber);
  if (!success) {
    const message = params.get("data.message");
    if (message) destination.searchParams.set("reason", message);
  }

  return NextResponse.redirect(destination);
}

/**
 * Paymob echoes our `special_reference` back as `merchant_order_id`. We fall
 * back to the Paymob order id we saved when the intention was created.
 */
async function findOrder(
  admin: SupabaseAdminClient,
  transaction: PaymobTransaction,
): Promise<SettledOrder | null> {
  const reference =
    (transaction.order?.merchant_order_id as string | undefined) ??
    (typeof transaction.extras === "object" && transaction.extras !== null
      ? ((transaction.extras as Record<string, unknown>).order_number as
          | string
          | undefined)
      : undefined);

  const columns = "id, order_number, total_cents, refunded_cents";

  if (reference) {
    const { data } = await admin
      .from("orders")
      .select(columns)
      .eq("order_number", reference)
      .maybeSingle();
    if (data) return data;
  }

  const paymobOrderId = transaction.order?.id;
  if (paymobOrderId !== undefined && paymobOrderId !== null) {
    const { data } = await admin
      .from("payments")
      .select(`order:orders(${columns})`)
      .eq("paymob_order_id", String(paymobOrderId))
      .limit(1)
      .maybeSingle<{ order: SettledOrder | null }>();
    if (data?.order) return data.order;
  }

  return null;
}
