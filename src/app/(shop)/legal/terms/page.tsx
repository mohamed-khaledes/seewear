import type { Metadata } from "next";

import { TermsPage } from "@/features/content/server";

export const metadata: Metadata = {
  title: "Terms of sale",
  description: "The agreement behind every SEEWEAR order: acceptance, prices, payment, delivery and returns.",
  alternates: { canonical: "/legal/terms" },
};

export default function Page() {
  return <TermsPage />;
}
