import type { Metadata } from "next";

import { getT } from "@/lib/i18n/server";

import { ProductListPage } from "@/features/products/pages/product-list-page";
import type { RawSearchParams } from "@/features/products/services/utils/filters";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("meta.shopTitle"), description: t("meta.shopDescription") };
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const params = await searchParams;
  return <ProductListPage searchParams={params} />;
}
