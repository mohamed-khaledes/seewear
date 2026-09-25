import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, FileText, Package, ShieldCheck, ShieldAlert } from "lucide-react";

import { ProductShot } from "@/components/common/product-shot";
import { StatusPill } from "@/components/common/status-pill";
import { formatDateTime, formatMoney } from "@/lib/utils";
import {
  orderStatusMeta,
  paymentMethodLabel,
  paymentStatus,
  readShippingAddress,
} from "@/features/orders";
import { DashboardTopbar } from "@/features/dashboard/components/dashboard-topbar";
import { OrderActions } from "@/features/dashboard/components/order-actions";
import { OrderStatusForm } from "@/features/dashboard/components/order-status-form";
import { Panel } from "@/features/dashboard/components/panel";
import { getCourierDriver } from "@/lib/courier";
import { getAdminOrder } from "@/features/dashboard/services/api/dashboard.server";

export async function OrderAdminDetailPage({ orderId }: { orderId: string }) {
  const order = await getAdminOrder(orderId);
  if (!order) notFound();

  const address = readShippingAddress(order.shipping_address);
  const meta = orderStatusMeta[order.status];
  // Null unless this deployment has a courier account connected, in which case
  // the parcel can be booked from here instead of typed in by hand.
  const courier = getCourierDriver();

  return (
    <>
      <DashboardTopbar
        title={order.order_number}
        subtitle={`Placed ${formatDateTime(order.created_at)} · ${paymentMethodLabel[order.payment_method]}`}
        actions={
          <OrderActions
            orderId={order.id}
            status={order.status}
            paymentMethod={order.payment_method}
            totalCents={order.total_cents}
            refundedCents={order.refunded_cents}
            stockHeld={order.stock_held}
            courierLabel={courier?.label ?? null}
            shipmentId={order.shipment_id}
          />
        }
      />

      <div className="px-5 py-6 lg:px-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/dashboard/orders"
            className="up-xs inline-flex items-center gap-1 text-grey-2 transition-colors hover:text-ink"
          >
            <ChevronLeft className="size-3" />
            All orders
          </Link>
          <div className="flex flex-wrap gap-4">
            <Link
              href={`/dashboard/orders/${order.id}/packing-slip`}
              className="up-xs inline-flex items-center gap-1.5 text-grey-2 transition-colors hover:text-ink"
            >
              <Package className="size-3.5" />
              Packing slip
            </Link>
            {order.invoice_number ? (
              <Link
                href={`/dashboard/orders/${order.id}/invoice`}
                className="up-xs inline-flex items-center gap-1.5 text-grey-2 transition-colors hover:text-ink"
              >
                <FileText className="size-3.5" />
                Invoice {order.invoice_number}
              </Link>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="grid gap-4">
            <Panel title="Items" note={`${order.items.length} lines`} bodyClassName="p-0">
              <ul className="divide-y divide-line">
                {order.items.map((item) => (
                  <li key={item.id} className="flex items-center gap-3.5 px-5 py-4">
                    <div className="w-12 shrink-0 overflow-hidden rounded-md border border-line bg-[#f4f4f2]">
                      <ProductShot
                        src={item.image_url}
                        alt={item.name}
                        sizes="48px"
                        className="aspect-[1/1.1]"
                        imageClassName="p-1"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-semibold">{item.name}</p>
                      <p className="up-xs mt-0.5 text-grey-2">
                        {[item.color, item.size].filter(Boolean).join(" · ") || "One size"}{" "}
                        · Qty {item.quantity}
                      </p>
                    </div>
                    <span className="text-xs font-semibold tabular-nums">
                      {formatMoney(item.price_cents * item.quantity)}
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel title="Payments" note="Paymob" bodyClassName="p-0">
              {order.payments.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-grey-2">
                  No payment attempts recorded yet.
                </p>
              ) : (
                <ul className="divide-y divide-line">
                  {order.payments.map((payment) => {
                    const status = paymentStatus(payment.status);
                    return (
                      <li
                        key={payment.id}
                        className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
                      >
                        <div className="min-w-0">
                          <p className="text-[12.5px] font-semibold">
                            {payment.method ?? "Card"}
                          </p>
                          <p className="mt-0.5 font-mono text-[11px] text-grey">
                            {payment.transaction_id ?? "—"} ·{" "}
                            {formatDateTime(payment.created_at)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            title={
                              payment.hmac_verified
                                ? "HMAC verified"
                                : "Not verified by callback"
                            }
                            className={
                              payment.hmac_verified ? "text-ok" : "text-grey"
                            }
                          >
                            {payment.hmac_verified ? (
                              <ShieldCheck className="size-4" />
                            ) : (
                              <ShieldAlert className="size-4" />
                            )}
                          </span>
                          <StatusPill tone={status.tone}>{status.label}</StatusPill>
                          <span className="text-xs font-semibold tabular-nums">
                            {formatMoney(payment.amount_cents)}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>

            <Panel
              title="Activity"
              note={`${order.events.length} ${order.events.length === 1 ? "step" : "steps"}`}
              bodyClassName="p-0"
            >
              {order.events.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-grey-2">
                  Nothing logged yet. Every status change lands here from now on.
                </p>
              ) : (
                <ol className="divide-y divide-line">
                  {order.events.map((event) => (
                    <li
                      key={event.id}
                      className="flex flex-wrap items-start justify-between gap-3 px-5 py-3.5"
                    >
                      <div className="min-w-0">
                        <p className="text-[12.5px] font-semibold">
                          {orderStatusMeta[event.status].label}
                        </p>
                        {event.note ? (
                          <p className="mt-0.5 text-[11px] text-grey-2">{event.note}</p>
                        ) : null}
                      </div>
                      <span className="text-[11px] tabular-nums text-grey">
                        {formatDateTime(event.created_at)}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </Panel>
          </div>

          <aside className="grid h-fit gap-4">
            <Panel title="Status">
              <div className="grid gap-4">
                <div className="grid gap-2.5">
                  <StatusPill tone={meta.tone} className="w-fit">
                    {meta.label}
                  </StatusPill>
                  <p className="text-sm text-grey-2">
                    {order.status_note ?? meta.blurb}
                  </p>
                  {order.fulfilled_at ? (
                    <p className="up-xs text-grey">
                      Shipped {formatDateTime(order.fulfilled_at)}
                    </p>
                  ) : null}
                  {order.delivered_at ? (
                    <p className="up-xs text-grey">
                      Delivered {formatDateTime(order.delivered_at)}
                    </p>
                  ) : null}
                </div>

                <div className="border-t border-line pt-4">
                  <OrderStatusForm
                    orderId={order.id}
                    status={order.status}
                    courier={order.courier}
                    trackingNumber={order.tracking_number}
                    trackingUrl={order.tracking_url}
                  />
                </div>
              </div>
            </Panel>

            <Panel title="Totals">
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
                    order.shipping_cents === 0
                      ? "Free"
                      : formatMoney(order.shipping_cents)
                  }
                />
                <Row label="VAT" value={formatMoney(order.tax_cents)} />
                <div className="mt-1.5 flex items-baseline justify-between border-t border-line pt-3.5">
                  <dt className="font-bold">Total</dt>
                  <dd className="text-base font-bold tabular-nums">
                    {formatMoney(order.total_cents)}
                  </dd>
                </div>
                {order.refunded_cents > 0 ? (
                  <Row label="Refunded" value={`-${formatMoney(order.refunded_cents)}`} />
                ) : null}
                <Row label="Payment" value={paymentMethodLabel[order.payment_method]} />
                {order.restocked_at ? (
                  <p className="up-xs text-grey">
                    Stock returned {formatDateTime(order.restocked_at)}
                  </p>
                ) : null}
              </dl>
            </Panel>

            <Panel title="Customer">
              <p className="text-sm font-semibold">
                {order.profile?.full_name ?? address.fullName ?? "Guest"}
              </p>
              <p className="mt-0.5 text-xs text-grey-2">{order.email}</p>
              {!order.user_id ? (
                <p className="up-xs mt-2 text-grey">Guest checkout</p>
              ) : null}

              <address className="mt-4 border-t border-line pt-4 text-sm not-italic leading-relaxed text-grey-2">
                {[
                  address.fullName,
                  address.line1,
                  address.line2,
                  [address.city, address.governorate].filter(Boolean).join(", "),
                  [address.postalCode, address.country].filter(Boolean).join(" "),
                  address.phone ?? order.profile?.phone,
                ]
                  .filter((line) => line && line.trim())
                  .map((line, index) => (
                    <span key={index} className="block">
                      {line}
                    </span>
                  ))}
              </address>
            </Panel>
          </aside>
        </div>
      </div>
    </>
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
