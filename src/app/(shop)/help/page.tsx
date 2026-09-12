import type { Metadata } from "next";

import { HelpIndexPage } from "@/features/content";

export const metadata: Metadata = {
  title: "Help",
  description:
    "Shipping rates, returns, sizing and how to reach a person at SEEWEAR.",
};

export default function Page() {
  return <HelpIndexPage />;
}
