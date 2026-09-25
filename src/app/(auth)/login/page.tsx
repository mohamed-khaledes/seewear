import type { Metadata } from "next";

import { getT } from "@/lib/i18n/server";

import { LoginPage } from "@/features/auth/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("meta.loginTitle"),
    description: t("meta.loginDescription"),
  };
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return <LoginPage next={next} />;
}
