import type { Metadata } from "next";

import { getT } from "@/lib/i18n/server";

import { TrackOrderPage } from "@/features/orders/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("meta.trackTitle"), description: t("meta.trackDescription") };
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order } = await searchParams;
  return <TrackOrderPage orderNumber={order ?? ""} />;
}
