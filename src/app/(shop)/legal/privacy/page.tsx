import type { Metadata } from "next";

import { PrivacyPage } from "@/features/content/server";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "What SEEWEAR keeps about you, why, who else sees it, and how to have it removed.",
  alternates: { canonical: "/legal/privacy" },
};

export default function Page() {
  return <PrivacyPage />;
}
