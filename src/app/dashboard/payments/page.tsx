import type { Metadata } from "next";

import { isPaymobConfigured } from "@/lib/paymob";
import { PaymentsAdminPage } from "@/features/dashboard/server";

export const metadata: Metadata = { title: "Payments", robots: { index: false } };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  return <PaymentsAdminPage live={isPaymobConfigured()} page={Number(page ?? 1)} />;
}
