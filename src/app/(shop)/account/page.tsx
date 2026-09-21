import type { Metadata } from "next";

import { AccountPage } from "@/features/auth/server";

export const metadata: Metadata = { title: "Account", robots: { index: false } };

// Session-dependent: never serve a prerendered copy.
export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ password?: string }>;
}) {
  const { password } = await searchParams;
  return <AccountPage passwordUpdated={password === "updated"} />;
}
