import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import { queryKeys } from "@/lib/react-query";
import { getT } from "@/lib/i18n/server";
import { getQueryClient } from "@/lib/react-query/query-client";
import { ProductResults } from "@/features/products/components/product-results";
import {
  getCatalogFacets,
  getCategories,
  getProducts,
} from "@/features/products/services/api/products.server";
import {
  parseProductFilters,
  type RawSearchParams,
} from "@/features/products/services/utils/filters";
import { FilterPanel } from "@/features/search/components/filter-panel";
import { FilterToolbar } from "@/features/search/components/filter-toolbar";

export async function ProductListPage({
  searchParams,
}: {
  searchParams: RawSearchParams;
}) {
  const filters = parseProductFilters(searchParams);
  const queryClient = getQueryClient();
  const t = await getT();

  // The filter rail used to fetch its facets from the browser: three round
  // trips to Supabase before the sidebar could paint, ~450ms each. They are
  // catalogue-wide and barely change, so the server fetches them alongside the
  // first page and hands them over already warm.
  const [firstPage] = await Promise.all([
    getProducts({ ...filters, page: 1 }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.facets.list(),
      queryFn: getCatalogFacets,
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.categories.list(),
      queryFn: getCategories,
    }),
  ]);

  const heading = filters.q
    ? t("listing.resultsFor", { query: filters.q })
    : filters.category
      ? filters.category.replace(/-/g, " ")
      : filters.onSale
        ? t("listing.theSale")
        : t("listing.allPieces");

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="bg-concrete">
        <div className="border-b border-line bg-paper px-5 pb-6 pt-9 lg:px-6">
          <p className="up-xs text-grey-2">SEEWEAR</p>
          <h1 className="mt-2 text-2xl font-bold capitalize tracking-tight lg:text-3xl">
            {heading}
          </h1>
        </div>

        <FilterToolbar filters={filters} total={firstPage.total} />

        <div className="lg:grid lg:grid-cols-[248px_1fr]">
          <aside className="hidden border-e border-line bg-paper px-5 py-7 lg:block">
            <FilterPanel filters={filters} />
          </aside>

          <div>
            <ProductResults filters={filters} initialPage={firstPage} />
          </div>
        </div>
      </div>
    </HydrationBoundary>
  );
}
