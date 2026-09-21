import "server-only";

import { sendOrderConfirmation } from "@/lib/email";
import type { SupabaseAdminClient } from "@/lib/supabase/admin";

type ConfirmationRow = {
  order_number: string;
  email: string;
  payment_method: "card" | "cod";
  invoice_number: string | null;
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
};

/**
 * Sends the order confirmation from what the database holds, never from what a
 * request claimed. Three callers: the Paymob webhook, the reconciliation job
 * when it finds a payment the webhook missed, and checkout for a cash order.
 * Each only calls this after the state change that justifies it has committed.
 */
export async function sendConfirmationForOrder(
  admin: SupabaseAdminClient,
  orderId: string,
): Promise<void> {
  const { data: order, error } = await admin
    .from("orders")
    .select(
      `order_number, email, payment_method, invoice_number, subtotal_cents,
       discount_cents, shipping_cents, tax_cents, total_cents, shipping_address,
       items:order_items(name, color, size, quantity, price_cents)`,
    )
    .eq("id", orderId)
    .maybeSingle<ConfirmationRow>();

  if (error || !order) {
    console.error("[orders] could not load order for confirmation email", error);
    return;
  }

  await sendOrderConfirmation({
    orderNumber: order.order_number,
    email: order.email,
    paymentMethod: order.payment_method,
    invoiceNumber: order.invoice_number,
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
