import type { Metadata } from "next";

import { CustomerAdminDetailPage } from "@/features/dashboard/server";

export const metadata: Metadata = { title: "Customer", robots: { index: false } };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CustomerAdminDetailPage customerId={id} />;
}
