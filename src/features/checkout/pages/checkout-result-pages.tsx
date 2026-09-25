import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/utils";
import { getT } from "@/lib/i18n/server";
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

export async function CheckoutSuccessPage({
  orderNumber,
  method,
}: {
  orderNumber: string;
  /**
   * From the redirect, not the database: a guest cannot read their order here,
   * and the wording must not claim a cash order was paid. It changes words
   * only, never what data is shown.
   */
  method?: string;
}) {
  const [order, t] = await Promise.all([loadVisibleOrder(orderNumber), getT()]);
  const cash = method === "cod" || order?.status === "confirmed";

  return (
    <div className="bg-concrete px-5 py-20 lg:py-28">
      <div className="mx-auto max-w-lg bg-paper p-8 text-center lg:p-12">
        <CheckCircle2 className="mx-auto size-10 text-ok" strokeWidth={1.4} />
        <p className="up-xs mt-5 text-grey-2">{t("checkout.stepConfirmation")}</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">
          {cash ? t("orderResult.codTitle") : t("orderResult.confirmedTitle")}
        </h1>

        {orderNumber ? (
          <p className="mt-3 text-sm text-grey-2">
            {t("orderResult.orderIsIn", { number: orderNumber })}{" "}
            {cash ? t("orderResult.codBody") : t("orderResult.confirmedBody")}
          </p>
        ) : (
          <p className="mt-3 text-sm text-grey-2">{t("orderResult.confirmedBody")}</p>
        )}

        {order ? (
          <div className="mt-8 border-t border-line pt-6 text-start">
            <div className="mb-4 flex items-center justify-between">
              <span className="up-xs text-grey-2">{t("orderResult.status")}</span>
              <StatusPill tone={order.status === "pending" ? "warn" : "ok"}>
                {order.status === "pending"
                  ? t("orderResult.confirming")
                  : order.status === "confirmed"
                    ? t("orderResult.codStatus")
                    : t("orderResult.paid")}
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
              <span className="text-sm font-bold">{t("orderResult.total")}</span>
              <span className="text-base font-bold tabular-nums">
                {formatMoney(order.total_cents)}
              </span>
            </div>
          </div>
        ) : null}

        <div className="mt-8 grid gap-2">
          <Button asChild size="lg" className="up-sm h-12 font-semibold">
            <Link href={orderNumber ? `/track?order=${orderNumber}` : "/track"}>
              {t("orderResult.trackOrder")}
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="up-sm h-11 font-semibold">
            <Link href="/products">{t("common.keepShopping")}</Link>
          </Button>
        </div>

        <p className="mt-6 text-xs leading-relaxed text-grey">
          {t("orderResult.onlyWhenConfirmed")}
        </p>
      </div>
    </div>
  );
}

export async function CheckoutFailedPage({
  orderNumber,
  reason,
}: {
  orderNumber?: string;
  reason?: string;
}) {
  const t = await getT();

  return (
    <div className="bg-concrete px-5 py-20 lg:py-28">
      <div className="mx-auto max-w-lg bg-paper p-8 text-center lg:p-12">
        <XCircle className="mx-auto size-10 text-sale" strokeWidth={1.4} />
        <p className="up-xs mt-5 text-grey-2">{t("checkout.payment")}</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">
          {t("orderResult.failedTitle")}
        </h1>

        <p className="mt-3 text-sm leading-relaxed text-grey-2">
          {reason ? reason : t("orderResult.failedBody")}
        </p>

        {orderNumber ? (
          <p className="mt-2 text-xs text-grey">
            {t("orderResult.reference")} <span className="tabular-nums">{orderNumber}</span>
          </p>
        ) : null}

        <div className="mt-8 grid gap-2">
          <Button asChild size="lg" className="up-sm h-12 font-semibold">
            <Link href="/checkout">{t("common.tryAgain")}</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="up-sm h-11 font-semibold">
            <Link href="/cart">{t("orderResult.backToBag")}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
