import "server-only";

import { egp, toCsv } from "@/lib/csv";
import { createClient } from "@/lib/supabase/server";
import { readShippingAddress } from "@/features/orders";

/** PostgREST returns at most this many rows per request, so exports page through. */
const BATCH = 1000;

export type ExportRange = { from?: string; to?: string };

/** `yyyy-mm-dd` inclusive range, or nothing for all time. */
function bounds(range: ExportRange) {
  const valid = (value?: string) => (value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null);
  const from = valid(range.from);
  const to = valid(range.to);
  return {
    from: from ? `${from}T00:00:00+02:00` : null,
    // The whole of the last day, not its first second.
    to: to ? `${to}T23:59:59.999+02:00` : null,
  };
}

type OrderExportRow = {
  invoice_number: string | null;
  order_number: string;
  created_at: string;
  status: string;
  payment_method: string;
  email: string;
  shipping_address: unknown;
  subtotal_cents: number;
  discount_cents: number;
  discount_code: string | null;
  shipping_cents: number;
  tax_cents: number;
  total_cents: number;
  refunded_cents: number;
  courier: string | null;
  tracking_number: string | null;
};

/**
 * Every order in the range as CSV, runs as the signed-in admin so RLS still
 * decides what is visible. Cancelled checkouts are included and labelled —
 * an accountant reconciling against Paymob needs to see the ones that failed.
 */
export async function exportOrdersCsv(range: ExportRange): Promise<string> {
  const supabase = await createClient();
  const { from, to } = bounds(range);
  const rows: OrderExportRow[] = [];

  for (let offset = 0; ; offset += BATCH) {
    let query = supabase
      .from("orders")
      .select(
        `invoice_number, order_number, created_at, status, payment_method, email,
         shipping_address, subtotal_cents, discount_cents, discount_code, shipping_cents,
         tax_cents, total_cents, refunded_cents, courier, tracking_number`,
      )
      .order("created_at", { ascending: true })
      .range(offset, offset + BATCH - 1);
    if (from) query = query.gte("created_at", from);
    if (to) query = query.lte("created_at", to);

    const { data, error } = await query.returns<OrderExportRow[]>();
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < BATCH) break;
  }

  return toCsv(
    [
      "Invoice",
      "Order",
      "Placed",
      "Status",
      "Payment",
      "Email",
      "Name",
      "City",
      "Governorate",
      "Subtotal EGP",
      "Discount EGP",
      "Discount code",
      "Shipping EGP",
      "VAT EGP",
      "Total EGP",
      "Refunded EGP",
      "Courier",
      "Tracking",
    ],
    rows.map((order) => {
      const address = readShippingAddress(order.shipping_address);
      return [
        order.invoice_number,
        order.order_number,
        order.created_at,
        order.status,
        order.payment_method,
        order.email,
        address.fullName,
        address.city,
        address.governorate,
        egp(order.subtotal_cents),
        egp(order.discount_cents),
        order.discount_code,
        egp(order.shipping_cents),
        egp(order.tax_cents),
        egp(order.total_cents),
        egp(order.refunded_cents),
        order.courier,
        order.tracking_number,
      ];
    }),
  );
}

type PaymentExportRow = {
  created_at: string;
  provider: string;
  transaction_id: string | null;
  method: string | null;
  status: string;
  amount_cents: number;
  hmac_verified: boolean;
  order: { order_number: string } | null;
};

/** The payment ledger — refunds appear as negative amounts, as they are stored. */
export async function exportPaymentsCsv(range: ExportRange): Promise<string> {
  const supabase = await createClient();
  const { from, to } = bounds(range);
  const rows: PaymentExportRow[] = [];

  for (let offset = 0; ; offset += BATCH) {
    let query = supabase
      .from("payments")
      .select(
        "created_at, provider, transaction_id, method, status, amount_cents, hmac_verified, order:orders(order_number)",
      )
      .order("created_at", { ascending: true })
      .range(offset, offset + BATCH - 1);
    if (from) query = query.gte("created_at", from);
    if (to) query = query.lte("created_at", to);

    const { data, error } = await query.returns<PaymentExportRow[]>();
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < BATCH) break;
  }

  return toCsv(
    ["Date", "Order", "Provider", "Transaction", "Method", "Status", "Amount EGP", "Verified by callback"],
    rows.map((payment) => [
      payment.created_at,
      payment.order?.order_number,
      payment.provider,
      payment.transaction_id,
      payment.method,
      payment.status,
      egp(payment.amount_cents),
      payment.hmac_verified ? "yes" : "no",
    ]),
  );
}
