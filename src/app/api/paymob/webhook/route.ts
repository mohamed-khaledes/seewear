import { NextResponse, type NextRequest } from "next/server";

import { siteConfig } from "@/config/site";
import { sendOrderConfirmation } from "@/lib/email";
import { verifyTransactionHmac } from "@/lib/paymob";
import type { PaymobCallbackBody, PaymobTransaction } from "@/lib/paymob";
import { createAdminClient, type SupabaseAdminClient } from "@/lib/supabase/admin";
import { isServiceRoleConfigured } from "@/lib/supabase/config";
import type { Json } from "@/types/database.types";

export const dynamic = "force-dynamic";

/**
 * The only place an order may become `paid`.
 *
 * Paymob posts the transaction here and also sends the customer's browser here
 * on redirect. The POST is the trust boundary: the HMAC is recomputed from the
 * transaction fields and nothing is written unless it matches. The GET only
 * decides which page the shopper lands on.
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

  const succeeded = transaction.success === true && transaction.pending !== true;
  const refunded = transaction.is_refunded === true;

  const status = refunded
    ? "refunded"
    : succeeded
      ? "success"
      : transaction.pending === true
        ? "pending"
        : "declined";

  // The unique index on (provider, transaction_id) makes replays idempotent.
  const { error: paymentError } = await admin.from("payments").upsert(
    {
      order_id: order.id,
      provider: "paymob",
      paymob_order_id: String(transaction.order?.id ?? ""),
      transaction_id: String(transaction.id),
      method: describeMethod(transaction),
      amount_cents: Number(transaction.amount_cents) || order.total_cents,
      status,
      hmac_verified: true,
      raw: transaction as unknown as Json,
    },
    { onConflict: "provider,transaction_id" },
  );

  if (paymentError) {
    console.error("[paymob] payment upsert failed", paymentError);
    return NextResponse.json({ error: "payment write failed" }, { status: 500 });
  }

  if (refunded) {
    await admin.from("orders").update({ status: "refunded" }).eq("id", order.id);
    return NextResponse.json({ received: true, status: "refunded" });
  }

  if (!succeeded) {
    if (transaction.pending !== true) {
      console.warn(
        `[paymob] transaction ${transaction.id} declined for ${order.order_number}`,
      );
    }
    return NextResponse.json({ received: true, status });
  }

  // Atomic: flips pending → paid and decrements stock, exactly once.
  const { data: applied, error: applyError } = await admin.rpc("apply_paid_order", {
    p_order_id: order.id,
  });

  if (applyError) {
    console.error("[paymob] apply_paid_order failed", applyError);
    return NextResponse.json({ error: "could not apply order" }, { status: 500 });
  }

  if (applied) {
    await emailConfirmation(admin, order.id);
  }

  return NextResponse.json({ received: true, status: "paid", applied: Boolean(applied) });
}

/**
 * The customer's browser lands here after paying. The database truth comes from
 * the POST above — this only picks a page.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const success = params.get("success") === "true";
  const orderNumber =
    params.get("merchant_order_id") ?? params.get("special_reference") ?? "";

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

type MatchedOrder = { id: string; order_number: string; total_cents: number };

/**
 * Paymob echoes our `special_reference` back as `merchant_order_id`. We fall
 * back to the Paymob order id we saved when the intention was created.
 */
async function findOrder(
  admin: SupabaseAdminClient,
  transaction: PaymobTransaction,
): Promise<MatchedOrder | null> {
  const reference =
    (transaction.order?.merchant_order_id as string | undefined) ??
    (typeof transaction.extras === "object" && transaction.extras !== null
      ? ((transaction.extras as Record<string, unknown>).order_number as
          | string
          | undefined)
      : undefined);

  if (reference) {
    const { data } = await admin
      .from("orders")
      .select("id, order_number, total_cents")
      .eq("order_number", reference)
      .maybeSingle();
    if (data) return data;
  }

  const paymobOrderId = transaction.order?.id;
  if (paymobOrderId !== undefined && paymobOrderId !== null) {
    const { data } = await admin
      .from("payments")
      .select("order:orders(id, order_number, total_cents)")
      .eq("paymob_order_id", String(paymobOrderId))
      .limit(1)
      .maybeSingle<{ order: MatchedOrder | null }>();
    if (data?.order) return data.order;
  }

  return null;
}

function describeMethod(transaction: PaymobTransaction): string {
  const source = transaction.source_data;
  if (!source) return "Card";

  const type = source.sub_type ?? source.type ?? "Card";
  const pan = source.pan;

  return pan ? `${type} •••• ${String(pan).slice(-4)}` : String(type);
}

async function emailConfirmation(admin: SupabaseAdminClient, orderId: string) {
  const { data: order, error } = await admin
    .from("orders")
    .select(
      `order_number, email, subtotal_cents, discount_cents, shipping_cents,
       tax_cents, total_cents, shipping_address,
       items:order_items(name, color, size, quantity, price_cents)`,
    )
    .eq("id", orderId)
    .maybeSingle<{
      order_number: string;
      email: string;
      subtotal_cents: number;
      discount_cents: number;
      shipping_cents: number;
      tax_cents: number;
      total_cents: number;
      shipping_address: Record<string, string> | null;
      items: {
        name: string;
        color: string | null;
        size: string | null;
        quantity: number;
        price_cents: number;
      }[];
    }>();

  if (error || !order) {
    console.error("[paymob] could not load order for confirmation email", error);
    return;
  }

  await sendOrderConfirmation({
    orderNumber: order.order_number,
    email: order.email,
    lines: order.items.map((item) => ({
      name: item.name,
      color: item.color,
      size: item.size,
      quantity: item.quantity,
      priceCents: item.price_cents,
    })),
    subtotalCents: order.subtotal_cents,
    discountCents: order.discount_cents,
    shippingCents: order.shipping_cents,
    taxCents: order.tax_cents,
    totalCents: order.total_cents,
    shippingAddress: order.shipping_address ?? {},
  });
}
