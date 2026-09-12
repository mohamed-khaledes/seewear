import type { Metadata } from "next";

import { ShippingPage } from "@/features/content";

export const metadata: Metadata = {
  title: "Shipping",
  description:
    "Flat-rate express shipping across Egypt, free over the order threshold, with delivery times by governorate.",
};

export default function Page() {
  return <ShippingPage />;
}
