import type { Metadata } from "next";

import { OverviewPage } from "@/features/dashboard/server";

export const metadata: Metadata = { title: "Overview", robots: { index: false } };

export default function Page() {
  return <OverviewPage />;
}
