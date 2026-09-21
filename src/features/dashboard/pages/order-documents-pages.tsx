import { notFound } from "next/navigation";
import { Banknote } from "lucide-react";

import { formatDate, formatMoney } from "@/lib/utils";
import { getStoreSettings } from "@/lib/store-settings";
import { siteConfig } from "@/config/site";
import { InvoiceDocument, readShippingAddress } from "@/features/orders";
import {
  chargedTaxRate,
  InvoiceToolbar,
  sellerFromSettings,
} from "@/features/orders/server";
import { getAdminOrder } from "@/features/dashboard/services/api/dashboard.server";

export async function AdminInvoicePage({ orderId }: { orderId: string }) {
  const [order, settings] = await Promise.all([getAdminOrder(orderId), getStoreSettings()]);
  if (!order) notFound();

  return (
    <div className="px-5 py-8 print:p-0 lg:px-8">
      <InvoiceToolbar backHref={`/dashboard/orders/${order.id}`} backLabel={order.order_number} />
      <InvoiceDocument
        order={order}
        seller={sellerFromSettings(settings)}
        taxRate={chargedTaxRate(order)}
      />
    </div>
  );
}

/**
 * What goes in the box with the parcel, and what the packer works from. No
 * prices except one: for a cash order, the amount the courier has to collect
 * — the single number most likely to go wrong at the door.
 */
export async function PackingSlipPage({ orderId }: { orderId: string }) {
  const order = await getAdminOrder(orderId);
  if (!order) notFound();

  const address = readShippingAddress(order.shipping_address);
  const units = order.items.reduce((count, item) => count + item.quantity, 0);
  const collect = order.payment_method === "cod" ? order.total_cents - order.refunded_cents : 0;

  return (
    <div className="px-5 py-8 print:p-0 lg:px-8">
      <InvoiceToolbar backHref={`/dashboard/orders/${order.id}`} backLabel={order.order_number} />

      <article className="mx-auto w-full max-w-[210mm] bg-white p-8 text-ink shadow-sm print:max-w-none print:p-0 print:shadow-none sm:p-12">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b-2 border-ink pb-6">
          <div>
            <p className="text-2xl font-bold uppercase tracking-[0.3em]">{siteConfig.name}</p>
            <p className="up-xs mt-2 text-grey-2">Packing slip</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-2xl font-bold tabular-nums">{order.order_number}</p>
            <p className="mt-1 text-xs text-grey-2">Placed {formatDate(order.created_at)}</p>
            <p className="text-xs text-grey-2">
              {units} {units === 1 ? "piece" : "pieces"}
            </p>
          </div>
        </header>

        {collect > 0 ? (
          <div className="mt-6 flex items-center gap-4 border-2 border-ink p-4">
            <Banknote className="size-7 shrink-0" strokeWidth={1.5} />
            <div>
              <p className="up-xs text-grey-2">Cash on delivery — courier collects</p>
              <p className="text-2xl font-bold tabular-nums">{formatMoney(collect)}</p>
            </div>
          </div>
        ) : null}

        <section className="grid gap-6 border-b border-line py-6 sm:grid-cols-2">
          <div>
            <p className="up-xs mb-2 text-grey-2">Deliver to</p>
            <address className="text-base not-italic leading-relaxed">
              {[
                address.fullName,
                address.line1,
                address.line2,
                [address.city, address.governorate].filter(Boolean).join(", "),
                address.country,
              ]
                .filter((line) => line && String(line).trim())
                .map((line, index) => (
                  <span key={index} className={index === 0 ? "block font-bold" : "block"}>
                    {line}
                  </span>
                ))}
            </address>
            {address.phone ? (
              <p className="mt-2 font-mono text-base font-semibold tabular-nums">{address.phone}</p>
            ) : null}
          </div>
          <div>
            <p className="up-xs mb-2 text-grey-2">Courier</p>
            <p className="text-sm">{order.courier ?? "Not assigned yet"}</p>
            {order.tracking_number ? (
              <p className="mt-1 font-mono text-sm font-semibold tabular-nums">
                {order.tracking_number}
              </p>
            ) : null}
          </div>
        </section>

        <table className="mt-6 w-full text-sm">
          <thead>
            <tr className="border-b border-ink text-left">
              <th className="up-xs w-10 pb-2 font-semibold text-grey-2">
                <span className="sr-only">Packed</span>
              </th>
              <th className="up-xs pb-2 font-semibold text-grey-2">Item</th>
              <th className="up-xs pb-2 font-semibold text-grey-2">Colour · size</th>
              <th className="up-xs pb-2 text-right font-semibold text-grey-2">Qty</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id} className="border-b border-line">
                <td className="py-3">
                  <span className="block size-4 border-2 border-ink" aria-hidden="true" />
                </td>
                <td className="py-3 pr-4 font-medium">{item.name}</td>
                <td className="py-3 text-grey-2">
                  {[item.color, item.size].filter(Boolean).join(" · ") || "One size"}
                </td>
                <td className="py-3 text-right text-base font-bold tabular-nums">
                  {item.quantity}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <footer className="mt-12 border-t border-line pt-4 text-[11px] leading-relaxed text-grey">
          Returns within 14 days of delivery, unworn with tags on. Start one at{" "}
          {siteConfig.url.replace(/^https?:\/\//, "")}/help/returns or reply to your
          confirmation email.
        </footer>
      </article>
    </div>
  );
}
