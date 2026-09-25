import type { Metadata } from "next";

import { PackingSlipsBatchPage } from "@/features/dashboard/server";

export const metadata: Metadata = { title: "Packing slips", robots: { index: false } };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const { ids } = await searchParams;
  return <PackingSlipsBatchPage ids={(ids ?? "").split(",").filter(Boolean)} />;
}
