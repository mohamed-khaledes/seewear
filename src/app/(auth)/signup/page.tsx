import type { Metadata } from "next";

import { SignupPage } from "@/features/auth";

export const metadata: Metadata = { title: "Create an account" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return <SignupPage next={next} />;
}
