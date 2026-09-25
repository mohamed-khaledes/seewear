import type { Metadata } from "next";

import { getT } from "@/lib/i18n/server";

import { getMyAddresses, getSessionUser } from "@/features/auth/server";
import { CheckoutPage } from "@/features/checkout";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("meta.checkoutTitle"),
    description: t("meta.checkoutDescription"),
    robots: { index: false },
  };
}

export default async function Page() {
  const user = await getSessionUser();
  const savedAddresses = user ? await getMyAddresses() : [];
  return <CheckoutPage savedAddresses={savedAddresses} />;
}
