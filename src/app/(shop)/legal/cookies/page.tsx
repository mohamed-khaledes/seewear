import type { Metadata } from "next";

import { CookiesPage } from "@/features/content/server";

export const metadata: Metadata = {
  title: "Cookies",
  description: "The few cookies SEEWEAR sets, all of them needed for the shop to work.",
  alternates: { canonical: "/legal/cookies" },
};

export default function Page() {
  return <CookiesPage />;
}
