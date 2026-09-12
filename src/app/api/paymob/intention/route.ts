import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { siteConfig } from "@/config/site";
import { createIntention, isPaymobConfigured, PaymobError } from "@/lib/paymob";
import { createAdminClient } from "@/lib/supabase/admin";
import { isServiceRoleConfigured } from "@/lib/supabase/config";

const bodySchema = z.object({ orderNumber: z.string().trim().min(3).max(40) });

type OrderRow = {
  id: string;
  order_number: string;
  email: string;
  status: string;
  total_cents: number;
  shipping_address: Record<string, string> | null;
  items: { name: string; color: string | null; size: string | null; slug: string | null; price_cents: number; quantity: number }[];
};

/**
 * Re-opens payment on an order that is still pending — the "try again" path
 * after a declined card. The order and its totals already exist; this only
 * mints a fresh Paymob intention for them.
 */
export async function POST(request: NextRequest) {
  if (!isServiceRoleConfigured() || !isPaymobConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Payments are not configured on this deployment." },
      { status: 503 },
    );
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Bad request." }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: order } = await admin
    .from("orders")
    .select(
      `id, order_number, email, status, total_cents, shipping_address,
       items:order_items(name, color, size, slug, price_cents, quantity)`,
    )
    .eq("order_number", parsed.data.orderNumber)
    .maybeSingle<OrderRow>();

  if (!order) {
    return NextResponse.json({ ok: false, error: "Order not found." }, { status: 404 });
  }

  if (order.status !== "pending") {
    return NextResponse.json(
      { ok: false, error: "That order is not waiting on payment." },
      { status: 409 },
    );
  }

  const address = order.shipping_address ?? {};
  const nameParts = (address.fullName ?? "Customer").trim().split(/\s+/);

  try {
    const intention = await createIntention({
      amountCents: order.total_cents,
      currency: siteConfig.currency,
      items: order.items.map((item) => ({
        name: [item.name, item.color, item.size].filter(Boolean).join(" · "),
        amount: item.price_cents,
        description: item.slug ?? item.name,
        quantity: item.quantity,
      })),
      billingData: {
        first_name: nameParts[0] ?? "Customer",
        last_name: nameParts.slice(1).join(" ") || nameParts[0] || "Customer",
        email: order.email,
        phone_number: address.phone ?? "NA",
        street: [address.line1, address.line2].filter(Boolean).join(", ") || "NA",
        building: "NA",
        floor: "NA",
        apartment: "NA",
        city: address.city ?? "NA",
        state: address.governorate ?? "NA",
        country: address.country === "Egypt" ? "EG" : (address.country ?? "EG"),
        postal_code: address.postalCode || "NA",
      },
      customer: {
        first_name: nameParts[0] ?? "Customer",
        last_name: nameParts.slice(1).join(" ") || nameParts[0] || "Customer",
        email: order.email,
      },
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
      raw: { intention_id: intention.intentionId, retry: true },
    });

    return NextResponse.json({ ok: true, redirectUrl: intention.checkoutUrl });
  } catch (error) {
    console.error(
      "[paymob] retry intention failed",
      error instanceof PaymobError ? error.body : error,
    );
    return NextResponse.json(
      { ok: false, error: "The payment provider turned that away." },
      { status: 502 },
    );
  }
}
