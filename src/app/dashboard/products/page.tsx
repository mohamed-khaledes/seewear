import type { Metadata } from "next";

import { ProductsAdminPage } from "@/features/dashboard/server";

export const metadata: Metadata = { title: "Products", robots: { index: false } };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string; page?: string }>;
}) {
  const params = await searchParams;
  return <ProductsAdminPage searchParams={params} />;
}
