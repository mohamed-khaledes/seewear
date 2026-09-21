import { notFound } from "next/navigation";

import { JsonLd } from "@/components/common/json-ld";
import { siteConfig } from "@/config/site";

import { SectionHeader } from "@/components/layout/section-header";
import { ProductDetailView } from "@/features/products/components/product-detail-view";
import { ProductGrid } from "@/features/products/components/product-grid";
import { getReviewSummary, ProductReviews } from "@/features/reviews/server";
import {
  getProductBySlug,
  getRelatedProducts,
} from "@/features/products/services/api/products.server";

export async function ProductDetailPage({ slug }: { slug: string }) {
  const product = await getProductBySlug(slug);

  if (!product || product.status !== "active") notFound();

  const [related, reviews] = await Promise.all([
    getRelatedProducts(product, 5),
    getReviewSummary(product.id),
  ]);

  const url = `${siteConfig.url}/product/${product.slug}`;
  const inStock = product.variants.some((variant) => variant.stock > 0);
  const prices = product.variants.map((variant) => variant.price_cents ?? product.price_cents);
  const low = Math.min(product.price_cents, ...prices) / 100;
  const high = Math.max(product.price_cents, ...prices) / 100;

  // What Google reads for price, stock and stars in results. Built from the
  // same rows the page renders, so the snippet cannot disagree with the page.
  const structured: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description ?? undefined,
    image: product.images.map((image) =>
      image.url.startsWith("http") ? image.url : `${siteConfig.url}${image.url}`,
    ),
    sku: product.variants[0]?.sku ?? undefined,
    brand: { "@type": "Brand", name: siteConfig.name },
    url,
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "EGP",
      lowPrice: low.toFixed(2),
      highPrice: high.toFixed(2),
      offerCount: product.variants.length,
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url,
    },
    ...(reviews.count > 0 && reviews.average !== null
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: reviews.average,
            reviewCount: reviews.count,
          },
        }
      : {}),
  };

  return (
    <div className="bg-concrete">
      <JsonLd data={structured} />
      <ProductDetailView product={product} />

      <ProductReviews productId={product.id} productSlug={product.slug} />

      {related.length > 0 ? (
        <>
          <SectionHeader title="Wears well with" href="/products" />
          <ProductGrid products={related} />
        </>
      ) : null}
    </div>
  );
}
