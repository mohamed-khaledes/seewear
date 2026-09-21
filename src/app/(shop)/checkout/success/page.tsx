import type { Metadata } from "next";

import { CheckoutSuccessPage } from "@/features/checkout/server";

export const metadata: Metadata = {
  title: "Order confirmed",
  robots: { index: false },
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; method?: string }>;
}) {
  const { order, method } = await searchParams;
  return <CheckoutSuccessPage orderNumber={order ?? ""} method={method} />;
}
