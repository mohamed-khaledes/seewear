import type { Metadata } from "next";

import { OrdersPage } from "@/features/orders/server";

export const metadata: Metadata = { title: "Orders", robots: { index: false } };

// Session-dependent: never serve a prerendered copy.
export const dynamic = "force-dynamic";

export default function Page() {
  return <OrdersPage />;
}
