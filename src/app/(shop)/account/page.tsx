import type { Metadata } from "next";

import { getT } from "@/lib/i18n/server";

import { AccountPage } from "@/features/auth/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("meta.accountTitle"),
    description: t("meta.accountDescription"),
    robots: { index: false },
  };
}

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
