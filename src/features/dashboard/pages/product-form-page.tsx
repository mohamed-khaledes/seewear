import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { toEgp } from "@/lib/utils";
import { DashboardTopbar } from "@/features/dashboard/components/dashboard-topbar";
import { ProductForm } from "@/features/dashboard/components/product-form";
import {
  getAdminCategories,
  getAdminProduct,
} from "@/features/dashboard/services/api/dashboard.server";
import type { ProductFormValues } from "@/features/dashboard/types";

const BLANK: ProductFormValues = {
  name: "",
  slug: "",
  description: "",
  categoryId: "",
  status: "draft",
  featured: false,
  price: 0,
  compareAt: 0,
  imageUrls: [],
  variants: [],
};

export async function ProductFormPage({ productId }: { productId?: string }) {
  const categories = await getAdminCategories();

  let defaultValues = BLANK;
  let name = "";

  if (productId) {
    const product = await getAdminProduct(productId);
    if (!product) notFound();

    name = product.name;
    defaultValues = {
      name: product.name,
      slug: product.slug,
      description: product.description ?? "",
      categoryId: product.category_id ?? "",
      status: product.status,
      featured: product.featured,
      price: toEgp(product.price_cents),
      compareAt: product.compare_at_cents ? toEgp(product.compare_at_cents) : 0,
      imageUrls: product.images.map((image) => image.url),
      variants: product.variants.map((variant) => ({
        id: variant.id,
        color: variant.color ?? "",
        colorHex: variant.color_hex ?? "#141414",
        size: variant.size ?? "",
        sku: variant.sku ?? "",
        stock: variant.stock,
      })),
    };
  }

  return (
    <>
      <DashboardTopbar
        title={productId ? "Edit product" : "New product"}
        subtitle={productId ? name : "Add a piece to the catalogue"}
      />

      <div className="px-5 py-6 lg:px-8">
        <Link
          href="/dashboard/products"
          className="up-xs mb-5 inline-flex items-center gap-1 text-grey-2 transition-colors hover:text-ink"
        >
          <ChevronLeft className="size-3" />
          All products
        </Link>

        <ProductForm
          productId={productId}
          defaultValues={defaultValues}
          categories={categories}
        />
      </div>
    </>
  );
}
