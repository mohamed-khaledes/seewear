import type { Metadata } from "next";

import { CheckoutFailedPage } from "@/features/checkout/server";

export const metadata: Metadata = {
  title: "Payment failed",
  robots: { index: false },
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; reason?: string }>;
}) {
  const { order, reason } = await searchParams;
  return <CheckoutFailedPage orderNumber={order} reason={reason} />;
}
