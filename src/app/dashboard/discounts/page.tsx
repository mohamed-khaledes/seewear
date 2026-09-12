import type { Metadata } from "next";

import { DiscountsAdminPage } from "@/features/dashboard/server";

export const metadata: Metadata = { title: "Discounts", robots: { index: false } };

export default function Page() {
  return <DiscountsAdminPage />;
}
