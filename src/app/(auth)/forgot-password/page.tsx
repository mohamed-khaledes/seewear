import type { Metadata } from "next";

import { getT } from "@/lib/i18n/server";

import { ForgotPasswordPage } from "@/features/auth/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("meta.forgotTitle"),
    description: t("meta.forgotDescription"),
    robots: { index: false },
  };
}

export default function Page() {
  return <ForgotPasswordPage />;
}
