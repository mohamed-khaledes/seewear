import type { Metadata } from "next";

import { ProductFormPage } from "@/features/dashboard/server";

export const metadata: Metadata = { title: "New product", robots: { index: false } };

export default function Page() {
  return <ProductFormPage />;
}
