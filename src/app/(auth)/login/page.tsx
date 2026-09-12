import type { Metadata } from "next";

import { LoginPage } from "@/features/auth";

export const metadata: Metadata = { title: "Sign in" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return <LoginPage next={next} />;
}
