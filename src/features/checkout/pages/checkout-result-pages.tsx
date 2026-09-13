import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { StatusPill } from "@/components/common/status-pill";

type OrderSummaryRow = {
  order_number: string;
  status: string;
  total_cents: number;
  email: string;
  items: { name: string; color: string | null; size: string | null; quantity: number }[];
};

/**
 * Only shows line detail to someone RLS says may see the order — order numbers
 * are sequential, so a guessed one must not reveal anything.
 */
async function loadVisibleOrder(orderNumber: string): Promise<OrderSummaryRow | null> {
  if (!orderNumber || !isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select(
      "order_number, status, total_cents, email, items:order_items(name, color, size, quantity)",
    )
    .eq("order_number", orderNumber)
    .maybeSingle<OrderSummaryRow>();

  return data;
}

export async function CheckoutSuccessPage({ orderNumber }: { orderNumber: string }) {
  const order = await loadVisibleOrder(orderNumber);

  return (
    <div className="bg-concrete px-5 py-20 lg:py-28">
      <div className="mx-auto max-w-lg bg-paper p-8 text-center lg:p-12">
        <CheckCircle2 className="mx-auto size-10 text-ok" strokeWidth={1.4} />
        <p className="up-xs mt-5 text-grey-2">Confirmation</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Payment received</h1>

        {orderNumber ? (
          <p className="mt-3 text-sm text-grey-2">
            Order{" "}
            <span className="font-semibold tabular-nums text-ink">{orderNumber}</span> is
            in. A receipt is on its way to your inbox.
          </p>
        ) : (
          <p className="mt-3 text-sm text-grey-2">
            Your order is in. A receipt is on its way to your inbox.
          </p>
        )}

        {order ? (
          <div className="mt-8 border-t border-line pt-6 text-left">
            <div className="mb-4 flex items-center justify-between">
              <span className="up-xs text-grey-2">Status</span>
              <StatusPill tone={order.status === "pending" ? "warn" : "ok"}>
                {order.status === "pending" ? "Confirming payment" : "Paid"}
              </StatusPill>
            </div>

            <ul className="grid gap-2.5">
              {order.items.map((item, index) => (
                <li key={index} className="flex justify-between gap-4 text-sm">
                  <span className="text-grey-2">
                    {item.quantity} × {item.name}
                    {[item.color, item.size].filter(Boolean).length
                      ? ` (${[item.color, item.size].filter(Boolean).join(" / ")})`
                      : ""}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-5 flex items-baseline justify-between border-t border-line pt-4">
              <span className="text-sm font-bold">Total</span>
              <span className="text-base font-bold tabular-nums">
                {formatMoney(order.total_cents)}
              </span>
            </div>
          </div>
        ) : null}

        <div className="mt-8 grid gap-2">
          <Button asChild size="lg" className="up-sm h-12 font-semibold">
            <Link href={orderNumber ? `/track?order=${orderNumber}` : "/track"}>
              Track your order
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="up-sm h-11 font-semibold">
            <Link href="/products">Keep shopping</Link>
          </Button>
        </div>

        <p className="mt-6 text-xs leading-relaxed text-grey">
          Payment is only marked complete once Paymob confirms it to us directly. If the
          status still reads &ldquo;confirming&rdquo;, give it a minute.
        </p>
      </div>
    </div>
  );
}

export function CheckoutFailedPage({
  orderNumber,
  reason,
}: {
  orderNumber?: string;
  reason?: string;
}) {
  return (
    <div className="bg-concrete px-5 py-20 lg:py-28">
      <div className="mx-auto max-w-lg bg-paper p-8 text-center lg:p-12">
        <XCircle className="mx-auto size-10 text-sale" strokeWidth={1.4} />
        <p className="up-xs mt-5 text-grey-2">Payment</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">That did not go through</h1>

        <p className="mt-3 text-sm leading-relaxed text-grey-2">
          {reason
            ? reason
            : "The bank turned the payment down. Nothing has been charged, and your bag is untouched."}
        </p>

        {orderNumber ? (
          <p className="mt-2 text-xs text-grey">
            Reference <span className="tabular-nums">{orderNumber}</span>
          </p>
        ) : null}

        <div className="mt-8 grid gap-2">
          <Button asChild size="lg" className="up-sm h-12 font-semibold">
            <Link href="/checkout">Try again</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="up-sm h-11 font-semibold">
            <Link href="/cart">Back to bag</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
