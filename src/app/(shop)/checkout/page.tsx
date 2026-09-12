import type { Metadata } from "next";

import { CheckoutPage } from "@/features/checkout";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default function Page() {
  return <CheckoutPage />;
}
