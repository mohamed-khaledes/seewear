import type { Metadata } from "next";

import { CustomersAdminPage } from "@/features/dashboard/server";

export const metadata: Metadata = { title: "Customers", robots: { index: false } };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const params = await searchParams;
  return <CustomersAdminPage searchParams={params} />;
}
