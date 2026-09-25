import { formatDate, formatMoney } from "@/lib/utils";
import { paymentMethodLabel, type PaymentMethod } from "@/features/orders/services/utils/status";
import { readShippingAddress } from "@/features/orders/types";

export type InvoiceSeller = {
  name: string;
  legalName: string | null;
  commercialRegister: string | null;
  taxRegistration: string | null;
  registeredAddress: string | null;
  email: string;
};

export type InvoiceOrder = {
  order_number: string;
  invoice_number: string | null;
  created_at: string;
  email: string;
  payment_method: PaymentMethod;
  shipping_address: unknown;
  subtotal_cents: number;
  discount_cents: number;
  discount_code: string | null;
  shipping_cents: number;
  tax_cents: number;
  total_cents: number;
  refunded_cents: number;
  items: {
    id: string;
    name: string;
    color: string | null;
    size: string | null;
    quantity: number;
    price_cents: number;
  }[];
  /** The step that made this order a sale, for the issue date. */
  events?: { status: string; created_at: string }[];
};

/**
 * A tax invoice, laid out for A4.
 *
 * The seller block prints whatever legal identity Settings holds and leaves
 * out what it does not — an invoice with a blank "Tax registration:" line is
 * worse than one without the line. The issue date is when the order became a
 * sale (paid, or confirmed for cash), not when the checkout was opened.
 */
export function InvoiceDocument({
  order,
  seller,
  taxRate,
}: {
  order: InvoiceOrder;
  seller: InvoiceSeller;
  taxRate: number;
}) {
  const address = readShippingAddress(order.shipping_address);
  const sale = order.events?.find(
    (event) => event.status === "paid" || event.status === "confirmed",
  );
  const issued = sale?.created_at ?? order.created_at;

  return (
    <article className="mx-auto w-full max-w-[210mm] bg-white p-8 text-ink shadow-sm print:max-w-none print:p-0 print:shadow-none sm:p-12">
      <header className="flex flex-wrap items-start justify-between gap-6 border-b-2 border-ink pb-6">
        <div>
          <p className="text-2xl font-bold uppercase tracking-[0.3em]">{seller.name}</p>
          <div className="mt-3 grid gap-0.5 text-xs leading-relaxed text-grey-2">
            {seller.legalName ? <span>{seller.legalName}</span> : null}
            {seller.registeredAddress ? <span>{seller.registeredAddress}</span> : null}
            {seller.commercialRegister ? (
              <span>Commercial register {seller.commercialRegister}</span>
            ) : null}
            {seller.taxRegistration ? (
              <span>Tax registration {seller.taxRegistration}</span>
            ) : null}
            <span>{seller.email}</span>
          </div>
        </div>
        <div className="text-end">
          <p className="up-xs text-grey-2">Tax invoice</p>
          <p className="mt-1 font-mono text-lg font-bold tabular-nums">
            {order.invoice_number ?? "Not yet issued"}
          </p>
          <dl className="mt-3 grid gap-0.5 text-xs text-grey-2">
            <div>
              <dt className="inline">Issued </dt>
              <dd className="inline tabular-nums text-ink">{formatDate(issued)}</dd>
            </div>
            <div>
              <dt className="inline">Order </dt>
              <dd className="inline tabular-nums text-ink">{order.order_number}</dd>
            </div>
            <div>
              <dt className="inline">Payment </dt>
              <dd className="inline text-ink">{paymentMethodLabel[order.payment_method]}</dd>
            </div>
          </dl>
        </div>
      </header>

      <section className="grid gap-6 border-b border-line py-6 sm:grid-cols-2">
        <div>
          <p className="up-xs mb-2 text-grey-2">Billed to</p>
          <address className="text-sm not-italic leading-relaxed">
            {[
              address.fullName,
              order.email,
              address.phone,
            ]
              .filter(Boolean)
              .map((line, index) => (
                <span key={index} className="block">
                  {line}
                </span>
              ))}
          </address>
        </div>
        <div>
          <p className="up-xs mb-2 text-grey-2">Delivered to</p>
          <address className="text-sm not-italic leading-relaxed">
            {[
              address.line1,
              address.line2,
              [address.city, address.governorate].filter(Boolean).join(", "),
              address.country,
            ]
              .filter((line) => line && String(line).trim())
              .map((line, index) => (
                <span key={index} className="block">
                  {line}
                </span>
              ))}
          </address>
        </div>
      </section>

      <table className="mt-6 w-full text-sm">
        <thead>
          <tr className="border-b border-ink text-start">
            <th className="up-xs pb-2 font-semibold text-grey-2">Item</th>
            <th className="up-xs pb-2 text-end font-semibold text-grey-2">Qty</th>
            <th className="up-xs pb-2 text-end font-semibold text-grey-2">Unit</th>
            <th className="up-xs pb-2 text-end font-semibold text-grey-2">Amount</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.id} className="border-b border-line align-top">
              <td className="py-3 pe-4">
                <span className="font-medium">{item.name}</span>
                {[item.color, item.size].filter(Boolean).length ? (
                  <span className="block text-xs text-grey-2">
                    {[item.color, item.size].filter(Boolean).join(" · ")}
                  </span>
                ) : null}
              </td>
              <td className="py-3 text-end tabular-nums">{item.quantity}</td>
              <td className="py-3 text-end tabular-nums">{formatMoney(item.price_cents)}</td>
              <td className="py-3 text-end tabular-nums">
                {formatMoney(item.price_cents * item.quantity)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <dl className="ms-auto mt-6 grid w-full max-w-72 gap-1.5 text-sm">
        <Line label="Subtotal" value={formatMoney(order.subtotal_cents)} />
        {order.discount_cents > 0 ? (
          <Line
            label={order.discount_code ? `Discount (${order.discount_code})` : "Discount"}
            value={`-${formatMoney(order.discount_cents)}`}
          />
        ) : null}
        <Line
          label="Shipping"
          value={order.shipping_cents === 0 ? "Free" : formatMoney(order.shipping_cents)}
        />
        <Line
          label={`VAT ${Number((taxRate * 100).toFixed(2))}%`}
          value={formatMoney(order.tax_cents)}
        />
        <div className="mt-1.5 flex justify-between border-t-2 border-ink pt-2.5 text-base font-bold">
          <dt>Total</dt>
          <dd className="tabular-nums">{formatMoney(order.total_cents)}</dd>
        </div>
        {order.refunded_cents > 0 ? (
          <Line label="Refunded" value={`-${formatMoney(order.refunded_cents)}`} />
        ) : null}
      </dl>

      <footer className="mt-12 border-t border-line pt-4 text-[11px] leading-relaxed text-grey">
        Prices in Egyptian pounds. VAT is charged on the subtotal after any discount.
        {order.refunded_cents > 0
          ? " A refund has been issued against this invoice for the amount shown."
          : ""}
      </footer>
    </article>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-grey-2">
      <dt>{label}</dt>
      <dd className="tabular-nums text-ink">{value}</dd>
    </div>
  );
}
