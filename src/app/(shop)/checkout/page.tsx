import type { Metadata } from "next";

import { getMyAddresses, getSessionUser } from "@/features/auth/server";
import { CheckoutPage } from "@/features/checkout";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function Page() {
  const user = await getSessionUser();
  const savedAddresses = user ? await getMyAddresses() : [];
  return <CheckoutPage savedAddresses={savedAddresses} />;
}
