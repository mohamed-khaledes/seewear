import type { Metadata } from "next";

import { getT } from "@/lib/i18n/server";

import { CartPage } from "@/features/cart";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("meta.cartTitle"),
    description: t("meta.cartDescription"),
  };
}

export default function Page() {
  return <CartPage />;
}
