import { NextResponse, type NextRequest } from "next/server";

import { siteConfig } from "@/config/site";
import { createAdminClient } from "@/lib/supabase/admin";
import { isServiceRoleConfigured } from "@/lib/supabase/config";
import { createIntention, isPaymobConfigured, PaymobError } from "@/lib/paymob";
import { getSessionUser } from "@/features/auth/server";
import {
  CheckoutError,
  repriceCart,
} from "@/features/checkout/services/api/pricing.server";
import { checkoutRequestSchema, type CheckoutResponse } from "@/features/checkout/types";
import type { PricedCartLine } from "@/features/cart/types";

function splitName(fullName: string): { first: string; last: string } {
  const parts = fullName.trim().split(/\s+/);
  return {
    first: parts[0] ?? "Customer",
    last: parts.slice(1).join(" ") || parts[0] || "Customer",
  };
}

function fail(error: string, status = 400, extra?: object) {
  return NextResponse.json<CheckoutResponse>(
    { ok: false, error, ...extra },
    { status },
  );
}

/**
 * Creates the order, then hands off to Paymob.
 *
 * The browser sends variant ids and quantities only — every price, the shipping
 * rule, VAT and any discount are recomputed here from the database. The order
 * lands as `pending`; only the HMAC-verified webhook may mark it paid.
 */
export async function POST(request: NextRequest) {
  if (!isServiceRoleConfigured()) {
    return fail("Checkout is not configured on this deployment.", 503);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return fail("We could not read that request.");
  }

  const parsed = checkoutRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Check the form and try again.");
  }

  const { email, shipping, discountCode, items } = parsed.data;
  const admin = createAdminClient();
  const user = await getSessionUser();

  let priced;
  try {
    priced = await repriceCart(admin, items, discountCode);
  } catch (error) {
    if (error instanceof CheckoutError) {
      return fail(error.message, 409, { unavailable: error.unavailable });
    }
    console.error("[checkout] repricing failed", error);
    return fail("We could not price your bag just now. Try again in a moment.", 500);
  }

  const { data: orderNumber, error: numberError } = await admin.rpc("next_order_number");
  if (numberError || !orderNumber) {
    console.error("[checkout] order number failed", numberError);
    return fail("We could not open an order. Try again in a moment.", 500);
  }

  const { data: order, error: orderError } = await admin
    .from("orders")
    .insert({
      order_number: orderNumber,
      user_id: user?.id ?? null,
      email,
      status: "pending",
      subtotal_cents: priced.totals.subtotalCents,
      shipping_cents: priced.totals.shippingCents,
      discount_cents: priced.totals.discountCents,
      tax_cents: priced.totals.taxCents,
      total_cents: priced.totals.totalCents,
      currency: siteConfig.currency,
      shipping_address: { ...shipping, email },
      discount_code: priced.discount?.code ?? null,
    })
    .select("id, order_number, total_cents")
    .single();

  if (orderError || !order) {
    console.error("[checkout] order insert failed", orderError);
    return fail("We could not open an order. Try again in a moment.", 500);
  }

  const { error: itemsError } = await admin.from("order_items").insert(
    priced.lines.map((line: PricedCartLine) => ({
      order_id: order.id,
      product_id: line.productId,
      variant_id: line.variantId,
      name: line.name,
      slug: line.slug,
      color: line.color,
      size: line.size,
      image_url: line.imageUrl,
      price_cents: line.priceCents,
      quantity: line.quantity,
    })),
  );

  if (itemsError) {
    console.error("[checkout] order items insert failed", itemsError);
    await admin.from("orders").delete().eq("id", order.id);
    return fail("We could not open an order. Try again in a moment.", 500);
  }

  if (!isPaymobConfigured()) {
    return fail(
      "Card payments are not connected on this deployment yet. Add the Paymob keys to take live orders.",
      503,
    );
  }

  const { first, last } = splitName(shipping.fullName);

  try {
    const intention = await createIntention({
      amountCents: order.total_cents,
      currency: siteConfig.currency,
      items: priced.lines.map((line: PricedCartLine) => ({
        name: [line.name, line.color, line.size].filter(Boolean).join(" · "),
        amount: line.priceCents,
        description: line.slug,
        quantity: line.quantity,
      })),
      billingData: {
        first_name: first,
        last_name: last,
        email,
        phone_number: shipping.phone,
        street: [shipping.line1, shipping.line2].filter(Boolean).join(", "),
        building: "NA",
        floor: "NA",
        apartment: "NA",
        city: shipping.city,
        state: shipping.governorate,
        country: shipping.country === "Egypt" ? "EG" : shipping.country,
        postal_code: shipping.postalCode || "NA",
      },
      customer: { first_name: first, last_name: last, email },
      specialReference: order.order_number,
      notificationUrl: `${siteConfig.url}/api/paymob/webhook`,
      redirectionUrl: `${siteConfig.url}/api/paymob/webhook`,
    });

    await admin.from("payments").insert({
      order_id: order.id,
      provider: "paymob",
      paymob_order_id: intention.paymobOrderId,
      amount_cents: order.total_cents,
      status: "pending",
      hmac_verified: false,
      raw: { intention_id: intention.intentionId },
    });

    return NextResponse.json<CheckoutResponse>({
      ok: true,
      orderNumber: order.order_number,
      redirectUrl: intention.checkoutUrl,
    });
  } catch (error) {
    const detail = error instanceof PaymobError ? error.body : error;
    console.error("[checkout] paymob intention failed", detail);

    await admin.from("orders").update({ status: "cancelled" }).eq("id", order.id);

    return fail("The payment provider turned that away. Try again in a moment.", 502);
  }
}
