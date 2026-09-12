import type { Metadata } from "next";

import { OrdersAdminPage } from "@/features/dashboard/server";

export const metadata: Metadata = { title: "Orders", robots: { index: false } };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; page?: string }>;
}) {
  const params = await searchParams;
  return <OrdersAdminPage searchParams={params} />;
}
