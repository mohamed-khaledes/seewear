import type { Metadata } from "next";

import { TrackOrderPage } from "@/features/orders/server";

export const metadata: Metadata = {
  title: "Track your order",
  description:
    "Follow a SEEWEAR order with your order number and email. No account needed.",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order } = await searchParams;
  return <TrackOrderPage orderNumber={order ?? ""} />;
}
