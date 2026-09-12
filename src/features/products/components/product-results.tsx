"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductGrid } from "@/features/products/components/product-grid";
import { useProductsInfinite } from "@/features/products/hooks/use-products";
import { useInfiniteScroll } from "@/features/products/hooks/use-infinite-scroll";
import type { ProductFilters, ProductPage } from "@/features/products/types";

export function ProductResults({
  filters,
  initialPage,
}: {
  filters: ProductFilters;
  initialPage: ProductPage;
}) {
  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useProductsInfinite(filters, initialPage);

  const sentinelRef = useInfiniteScroll({
    hasNextPage: Boolean(hasNextPage),
    isFetching: isFetchingNextPage,
    fetchNextPage,
  });

  const products = data?.pages.flatMap((page) => page.items) ?? [];

  if (isLoading) return <ResultsSkeleton />;

  if (isError) {
    return (
      <EmptyState
        title="We could not load the rail"
        body="Something went wrong reaching the catalogue. Refresh, and it will usually come back."
      />
    );
  }

  if (products.length === 0) {
    return (
      <EmptyState
        title="Nothing matches that yet"
        body="Loosen a filter or two — the catalogue is smaller than it looks."
        action={
          <Button asChild variant="outline" size="lg" className="up-sm font-semibold">
            <Link href="/products">See everything</Link>
          </Button>
        }
      />
    );
  }

  return (
    <>
      <ProductGrid products={products} priorityCount={5} />

      {/* The sentinel sits 600px before the end, so the next page is usually
          already in when the shopper reaches the bottom. The button stays as
          the keyboard and no-JS path — an observer that never fires must not
          strand anyone at page one. */}
      {hasNextPage ? (
        <div
          ref={sentinelRef}
          className="flex justify-center border-t border-line bg-paper py-10"
        >
          <Button
            variant="outline"
            size="lg"
            className="up-sm h-12 px-8 font-semibold"
            disabled={isFetchingNextPage}
            onClick={() => fetchNextPage()}
          >
            {isFetchingNextPage ? (
              <>
                <Loader2 className="animate-spin" />
                Loading
              </>
            ) : (
              "Load more"
            )}
          </Button>
        </div>
      ) : (
        <p className="up-xs border-t border-line bg-paper py-8 text-center text-grey">
          {products.length} {products.length === 1 ? "piece" : "pieces"} — that is
          everything
        </p>
      )}
    </>
  );
}

function ResultsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 border-t border-line bg-concrete p-3 sm:gap-4 sm:p-5 md:grid-cols-3 lg:p-6 xl:grid-cols-5">
      {Array.from({ length: 10 }).map((_, index) => (
        <div key={index} className="border border-line bg-paper">
          <Skeleton className="aspect-[1/1.05] rounded-none" />
          <div className="grid gap-2 border-t border-line p-3.5">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="border-y border-line bg-paper px-6 py-24 text-center">
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm text-grey-2">{body}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
