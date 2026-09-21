import type { Metadata } from "next";

import { PackingSlipPage } from "@/features/dashboard/server";

export const metadata: Metadata = { title: "Packing slip", robots: { index: false } };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PackingSlipPage orderId={id} />;
}
