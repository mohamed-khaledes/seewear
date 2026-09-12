import type { Metadata } from "next";

import { ProductListPage } from "@/features/products/pages/product-list-page";
import type { RawSearchParams } from "@/features/products/services/utils/filters";

export const metadata: Metadata = {
  title: "Shop",
  description: "Every SEEWEAR piece — hoodies, tees, outerwear and accessories.",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const params = await searchParams;
  return <ProductListPage searchParams={params} />;
}
