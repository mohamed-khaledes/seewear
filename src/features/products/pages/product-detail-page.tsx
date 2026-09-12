import { notFound } from "next/navigation";

import { SectionHeader } from "@/components/layout/section-header";
import { ProductDetailView } from "@/features/products/components/product-detail-view";
import { ProductGrid } from "@/features/products/components/product-grid";
import {
  getProductBySlug,
  getRelatedProducts,
} from "@/features/products/services/api/products.server";

export async function ProductDetailPage({ slug }: { slug: string }) {
  const product = await getProductBySlug(slug);

  if (!product || product.status !== "active") notFound();

  const related = await getRelatedProducts(product, 5);

  return (
    <div className="bg-concrete">
      <ProductDetailView product={product} />

      {related.length > 0 ? (
        <>
          <SectionHeader title="Wears well with" href="/products" />
          <ProductGrid products={related} />
        </>
      ) : null}
    </div>
  );
}
