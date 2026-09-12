import type { Metadata } from "next";

import { siteConfig } from "@/config/site";
import { ProductDetailPage } from "@/features/products/pages/product-detail-page";
import { getProductBySlug } from "@/features/products/server";
import { formatMoney } from "@/lib/utils";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) return { title: "Piece not found" };

  const description =
    product.description ??
    `${product.name} from ${siteConfig.name}, ${formatMoney(product.price_cents)}.`;
  const image = product.images[0]?.url;

  return {
    title: product.name,
    description,
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: {
      title: `${siteConfig.name} ${product.name}`,
      description,
      type: "website",
      images: image ? [{ url: image }] : undefined,
    },
  };
}

export default async function Page({ params }: { params: Params }) {
  const { slug } = await params;
  return <ProductDetailPage slug={slug} />;
}
