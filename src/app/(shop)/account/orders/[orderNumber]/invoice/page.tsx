import type { Metadata } from "next";

import { CustomerInvoicePage } from "@/features/orders/server";

type Params = Promise<{ orderNumber: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { orderNumber } = await params;
  return { title: `Invoice for ${orderNumber}`, robots: { index: false } };
}

export default async function Page({ params }: { params: Params }) {
  const { orderNumber } = await params;
  return <CustomerInvoicePage orderNumber={orderNumber} />;
}
