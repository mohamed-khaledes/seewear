import type { Metadata } from "next";

import { getT } from "@/lib/i18n/server";

import { OrdersPage } from "@/features/orders/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("meta.ordersTitle"),
    description: t("meta.ordersDescription"),
    robots: { index: false },
  };
}

// Session-dependent: never serve a prerendered copy.
export const dynamic = "force-dynamic";

export default function Page() {
  return <OrdersPage />;
}
