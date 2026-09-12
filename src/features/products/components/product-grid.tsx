import { ProductCard } from "@/features/products/components/product-card";
import { cn } from "@/lib/utils";
import type { ProductListItem } from "@/features/products/types";

type ProductGridProps = {
  products: ProductListItem[];
  className?: string;
  /** How many cards get eager-loaded images. */
  priorityCount?: number;
};

/**
 * Cards sit on the concrete ground with real space between them, rather than
 * the prototype's one-pixel hairline sheet — each one reads as its own object.
 */
export function ProductGrid({
  products,
  className,
  priorityCount = 0,
}: ProductGridProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 border-t border-line bg-concrete p-3 sm:gap-4 sm:p-5 md:grid-cols-3 lg:p-6 xl:grid-cols-5",
        className,
      )}
    >
      {products.map((product, index) => (
        <ProductCard
          key={product.id}
          product={product}
          priority={index < priorityCount}
        />
      ))}
    </div>
  );
}
