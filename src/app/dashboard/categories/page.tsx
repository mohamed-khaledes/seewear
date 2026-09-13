import type { Metadata } from "next";

import { CategoriesAdminPage } from "@/features/dashboard/server";

export const metadata: Metadata = { title: "Categories", robots: { index: false } };

export default function Page() {
  return <CategoriesAdminPage />;
}
