import type { Metadata } from "next";

import { AdminInvoicePage } from "@/features/dashboard/server";

export const metadata: Metadata = { title: "Invoice", robots: { index: false } };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminInvoicePage orderId={id} />;
}
