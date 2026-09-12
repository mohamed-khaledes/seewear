import type { Metadata } from "next";

import { AccountPage } from "@/features/auth/server";

export const metadata: Metadata = { title: "Account", robots: { index: false } };

// Session-dependent: never serve a prerendered copy.
export const dynamic = "force-dynamic";

export default function Page() {
  return <AccountPage />;
}
