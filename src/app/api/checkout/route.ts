import { NextResponse, type NextRequest } from "next/server";

import { siteConfig } from "@/config/site";
import { createAdminClient, type SupabaseAdminClient } from "@/lib/supabase/admin";
import { isServiceRoleConfigured } from "@/lib/supabase/config";
import { createIntention, isPaymobConfigured, PaymobError } from "@/lib/paymob";
import { allowByAddress, RATE_LIMITED_MESSAGE } from "@/lib/rate-limit";
import { loadPricingRules } from "@/lib/store-settings";
import { getSessionUser } from "@/features/auth/server";
import {
  CheckoutError,
  expireAbandonedCheckouts,
  repriceCart,
  sendConfirmationForOrder,
} from "@/features/checkout/server";
import {
  checkoutRequestSchema,
  type CheckoutResponse,
  type ShippingAddress,
} from "@/features/checkout/types";
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
 * Creates the order, holds its stock, then either confirms it for cash on
 * delivery or hands off to Paymob.
 *
 * The browser sends variant ids and quantities only — every price, the shipping
 * rate for the governorate, VAT and any discount are recomputed here from the
 * database. A card order lands as `pending` and only the HMAC-verified webhook
 * (or the reconciliation job asking Paymob directly) may mark it paid.
 */
export async function POST(request: NextRequest) {
  if (!isServiceRoleConfigured()) {
    return fail("Checkout is not configured on this deployment.", 503);
  }

  if (!(await allowByAddress("checkout"))) {
    return fail(RATE_LIMITED_MESSAGE, 429);
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

  const { email, shipping, discountCode, items, paymentMethod, saveAddress } = parsed.data;
  const admin = createAdminClient();
  const [user, rules] = await Promise.all([
    getSessionUser(),
    loadPricingRules(admin),
    // Stock held by checkouts abandoned over an hour ago goes back on sale
    // before this one tries to take it. The scheduled job does the same with a
    // Paymob check, but on the free Vercel plan that only runs daily.
    expireAbandonedCheckouts(admin).catch((error) =>
      console.error("[checkout] could not expire abandoned checkouts", error),
    ),
  ]);

  // Refuse before an order exists, not after — the old order of these checks
  // left a pending order behind for every attempt made without Paymob keys.
  if (paymentMethod === "cod" && !rules.codEnabled) {
    return fail("Cash on delivery is not available right now. Pay by card instead.", 409);
  }
  if (paymentMethod === "card" && !isPaymobConfigured()) {
    return fail(
      rules.codEnabled
        ? "Card payments are not connected yet. Choose cash on delivery instead."
        : "Card payments are not connected on this deployment yet.",
      503,
    );
  }

  let priced;
  try {
    priced = await repriceCart(admin, items, discountCode, {
      rules,
      governorate: shipping.governorate,
      email,
      userId: user?.id ?? null,
    });
  } catch (error) {
    if (error instanceof CheckoutError) {
      return fail(error.message, 409, { unavailable: error.unavailable });
    }
    console.error("[checkout] repricing failed", error);
    return fail("We could not price your bag just now. Try again in a moment.", 500);
  }

  // The summary showed this code as applied. If it has stopped being valid
  // since, charging the higher total without saying so would be a surprise.
  if (discountCode && priced.discountRejection) {
    return fail(`${priced.discountRejection} Remove it to see your new total.`, 409);
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
      payment_method: paymentMethod,
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

  // Take the stock now, all of it or none. Two shoppers racing for the last
  // piece used to both reach Paymob; now the second is told here, before paying.
  const { error: holdError } = await admin.rpc("hold_order_stock", { p_order_id: order.id });
  if (holdError) {
    await admin.from("orders").delete().eq("id", order.id);
    if (holdError.message.includes("insufficient_stock")) {
      return fail(
        "Someone else just bought the last of one of these. Update your bag and try again.",
        409,
      );
    }
    console.error("[checkout] stock hold failed", holdError);
    return fail("We could not reserve your pieces. Try again in a moment.", 500);
  }

  if (user && saveAddress) {
    await rememberAddress(admin, user.id, shipping);
  }

  if (paymentMethod === "cod") {
    const { error: confirmError } = await admin
      .from("orders")
      .update({
        status: "confirmed",
        status_note: "Confirmed. Pay in cash when the courier arrives.",
      })
      .eq("id", order.id)
      .eq("status", "pending");

    if (confirmError) {
      console.error("[checkout] cash confirmation failed", confirmError);
      await admin.rpc("cancel_order", { p_order_id: order.id, p_note: "Could not confirm" });
      return fail("We could not confirm that order. Try again in a moment.", 500);
    }

    await sendConfirmationForOrder(admin, order.id);

    return NextResponse.json<CheckoutResponse>({
      ok: true,
      orderNumber: order.order_number,
      redirectUrl: `/checkout/success?order=${encodeURIComponent(order.order_number)}&method=cod`,
    });
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

    // Give the stock straight back rather than waiting for the expiry job.
    await admin.rpc("cancel_order", {
      p_order_id: order.id,
      p_note: "The payment provider did not open a checkout.",
    });

    return fail("The payment provider turned that away. Try again in a moment.", 502);
  }
}

/**
 * Keeps the address for next time, unless the shopper already has this exact
 * one. The first address saved becomes the default.
 */
async function rememberAddress(
  admin: SupabaseAdminClient,
  userId: string,
  shipping: ShippingAddress,
) {
  const { data: existing } = await admin
    .from("addresses")
    .select("id, line1, city, governorate")
    .eq("user_id", userId);

  const same = (existing ?? []).some(
    (address) =>
      address.line1.trim().toLowerCase() === shipping.line1.trim().toLowerCase() &&
      address.city.trim().toLowerCase() === shipping.city.trim().toLowerCase() &&
      address.governorate === shipping.governorate,
  );
  if (same) return;

  const { error } = await admin.from("addresses").insert({
    user_id: userId,
    full_name: shipping.fullName,
    phone: shipping.phone,
    line1: shipping.line1,
    line2: shipping.line2 || null,
    city: shipping.city,
    governorate: shipping.governorate,
    postal_code: shipping.postalCode || null,
    is_default: (existing ?? []).length === 0,
  });

  // Saving the address is a convenience; failing to must never fail the order.
  if (error) console.error("[checkout] could not save address", error);
}
