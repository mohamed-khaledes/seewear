import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { ProductShot } from "@/components/common/product-shot";
import { StatusPill } from "@/components/common/status-pill";
import { formatDateTime, formatMoney } from "@/lib/utils";
import { OrderTimeline } from "@/features/orders/components/order-timeline";
import { getMyOrder } from "@/features/orders/services/api/orders.server";
import {
  orderStatusMeta,
  paymentStatus,
} from "@/features/orders/services/utils/status";
import { readShippingAddress } from "@/features/orders/types";

export async function OrderDetailPage({ orderNumber }: { orderNumber: string }) {
  const order = await getMyOrder(orderNumber);

  if (!order) notFound();

  const address = readShippingAddress(order.shipping_address);
  const meta = orderStatusMeta[order.status];

  return (
    <div className="bg-concrete">
      <div className="border-b border-line bg-paper px-5 pb-6 pt-9 lg:px-6">
        <Link
          href="/account/orders"
          className="up-xs inline-flex items-center gap-1 text-grey-2 transition-colors hover:text-ink"
        >
          <ChevronLeft className="size-3" />
          All orders
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <h1 className="text-2xl font-bold tabular-nums tracking-tight lg:text-3xl">
            {order.order_number}
          </h1>
          <StatusPill tone={meta.tone}>{meta.label}</StatusPill>
        </div>
        <p className="up-xs mt-2 text-grey-2">
          Placed {formatDateTime(order.created_at)}
        </p>
      </div>

      <div className="mx-auto grid max-w-5xl gap-5 px-5 py-8 lg:grid-cols-[1fr_320px] lg:px-6">
        <div className="grid gap-5">
          <section className="border border-line bg-paper p-5">
            <h2 className="up-sm mb-4 text-grey-2">Items</h2>
            <ul className="divide-y divide-line">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center gap-4 py-4 first:pt-0">
                  <div className="w-16 shrink-0 overflow-hidden rounded border border-line bg-white">
                    <ProductShot
                      src={item.image_url}
                      alt={item.name}
                      sizes="64px"
                      className="aspect-[1/1.08]"
                      imageClassName="p-1.5"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    {item.slug ? (
                      <Link
                        href={`/product/${item.slug}`}
                        className="text-sm font-semibold hover:underline"
                      >
                        {item.name}
                      </Link>
                    ) : (
                      <p className="text-sm font-semibold">{item.name}</p>
                    )}
                    <p className="up-xs mt-1 text-grey-2">
                      {[item.color, item.size].filter(Boolean).join(" · ") || "One size"}{" "}
                      · Qty {item.quantity}
                    </p>
                  </div>
                  <p className="text-sm font-semibold tabular-nums">
                    {formatMoney(item.price_cents * item.quantity)}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section className="border border-line bg-paper p-5">
            <h2 className="up-sm mb-4 text-grey-2">Progress</h2>
            <OrderTimeline
              status={order.status}
              events={order.events.map((event) => ({
                status: event.status,
                note: event.note,
                createdAt: event.created_at,
              }))}
              courier={order.courier}
              trackingNumber={order.tracking_number}
              trackingUrl={order.tracking_url}
            />
          </section>

          {order.payments.length > 0 ? (
            <section className="border border-line bg-paper p-5">
              <h2 className="up-sm mb-4 text-grey-2">Payment</h2>
              <ul className="divide-y divide-line">
                {order.payments.map((payment) => {
                  const status = paymentStatus(payment.status);
                  return (
                    <li
                      key={payment.id}
                      className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0"
                    >
                      <div>
                        <p className="text-sm font-semibold">
                          {payment.method ?? "Card"}
                        </p>
                        <p className="up-xs mt-1 text-grey-2">
                          {formatDateTime(payment.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusPill tone={status.tone}>{status.label}</StatusPill>
                        <span className="text-sm font-semibold tabular-nums">
                          {formatMoney(payment.amount_cents)}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}
        </div>

        <aside className="grid h-fit gap-5">
          <section className="border border-line bg-paper p-5">
            <h2 className="up-sm mb-4 text-grey-2">Summary</h2>
            <dl className="grid gap-2.5 text-sm">
              <Row label="Subtotal" value={formatMoney(order.subtotal_cents)} />
              {order.discount_cents > 0 ? (
                <Row
                  label={order.discount_code ? `Discount (${order.discount_code})` : "Discount"}
                  value={`-${formatMoney(order.discount_cents)}`}
                />
              ) : null}
              <Row
                label="Shipping"
                value={
                  order.shipping_cents === 0 ? "Free" : formatMoney(order.shipping_cents)
                }
              />
              <Row label="VAT" value={formatMoney(order.tax_cents)} />
              <div className="mt-2 flex items-baseline justify-between border-t border-line pt-3.5">
                <dt className="font-bold">Total</dt>
                <dd className="text-base font-bold tabular-nums">
                  {formatMoney(order.total_cents)}
                </dd>
              </div>
            </dl>
          </section>

          <section className="border border-line bg-paper p-5">
            <h2 className="up-sm mb-4 text-grey-2">Shipping to</h2>
            <address className="text-sm not-italic leading-relaxed text-grey-2">
              {[
                address.fullName,
                address.line1,
                address.line2,
                [address.city, address.governorate].filter(Boolean).join(", "),
                [address.postalCode, address.country].filter(Boolean).join(" "),
                address.phone,
              ]
                .filter((line) => line && line.trim())
                .map((line, index) => (
                  <span key={index} className="block">
                    {line}
                  </span>
                ))}
            </address>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-grey-2">
      <dt>{label}</dt>
      <dd className="tabular-nums text-ink">{value}</dd>
    </div>
  );
}
