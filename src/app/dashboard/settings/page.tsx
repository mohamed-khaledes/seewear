import type { Metadata } from "next";

import { getSessionUser } from "@/features/auth/server";
import { SettingsAdminPage } from "@/features/dashboard/server";

export const metadata: Metadata = { title: "Settings", robots: { index: false } };

export default async function Page() {
  const user = await getSessionUser();
  return <SettingsAdminPage isDemo={user?.isDemo ?? false} />;
}
