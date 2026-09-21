import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { PrintButton } from "@/components/common/print-button";
import { siteConfig } from "@/config/site";
import { getStoreSettings, type StoreSettings } from "@/lib/store-settings";
import {
  InvoiceDocument,
  type InvoiceOrder,
  type InvoiceSeller,
} from "@/features/orders/components/invoice-document";
import { getMyOrder } from "@/features/orders/services/api/orders.server";

export function sellerFromSettings(settings: StoreSettings): InvoiceSeller {
  return {
    name: settings.store_name || siteConfig.name,
    legalName: settings.legal_name,
    commercialRegister: settings.commercial_register,
    taxRegistration: settings.tax_registration,
    registeredAddress: settings.registered_address,
    email: settings.support_email || siteConfig.support.email,
  };
}

/**
 * The VAT rate this order was actually charged, recovered from its own totals.
 * Reading today's rate from Settings would reprint an old invoice at a rate it
 * was never charged if the rate has changed since.
 */
export function chargedTaxRate(order: Pick<InvoiceOrder, "subtotal_cents" | "discount_cents" | "tax_cents">): number {
  const taxable = order.subtotal_cents - order.discount_cents;
  return taxable > 0 ? order.tax_cents / taxable : 0;
}

export function InvoiceToolbar({ backHref, backLabel }: { backHref: string; backLabel: string }) {
  return (
    <div
      data-print-hide
      className="mx-auto mb-5 flex w-full max-w-[210mm] flex-wrap items-center justify-between gap-3"
    >
      <Link
        href={backHref}
        className="up-xs inline-flex items-center gap-1 text-grey-2 transition-colors hover:text-ink"
      >
        <ChevronLeft className="size-3" />
        {backLabel}
      </Link>
      <PrintButton />
    </div>
  );
}

export async function CustomerInvoicePage({ orderNumber }: { orderNumber: string }) {
  const [order, settings] = await Promise.all([getMyOrder(orderNumber), getStoreSettings()]);
  if (!order || !order.invoice_number) notFound();

  return (
    <div className="bg-concrete px-5 py-10 print:bg-white print:p-0">
      <InvoiceToolbar
        backHref={`/account/orders/${order.order_number}`}
        backLabel={`Back to ${order.order_number}`}
      />
      <InvoiceDocument
        order={order}
        seller={sellerFromSettings(settings)}
        taxRate={chargedTaxRate(order)}
      />
    </div>
  );
}
