import Link from "next/link";
import { Package, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DashboardTopbar } from "@/features/dashboard/components/dashboard-topbar";
import { EmptyPanelState } from "@/features/dashboard/components/panel";
import { FilterChips } from "@/features/dashboard/components/filter-chips";
import { ProductTable } from "@/features/dashboard/components/product-table";
import { TablePagination } from "@/features/dashboard/components/table-pagination";
import { AdminSearch } from "@/features/dashboard/components/admin-search";
import {
  getAdminProductCounts,
  getAdminProducts,
} from "@/features/dashboard/services/api/dashboard.server";

const FILTERS = ["", "active", "draft", "low", "out"] as const;
type Filter = (typeof FILTERS)[number];

function parseFilter(value?: string): Filter {
  return (FILTERS as readonly string[]).includes(value ?? "") ? (value as Filter) : "";
}

export async function ProductsAdminPage({
  searchParams,
}: {
  searchParams: { filter?: string; q?: string; page?: string };
}) {
  const search = searchParams.q ?? "";
  const filter = parseFilter(searchParams.filter);
  const page = Number(searchParams.page ?? 1);

  // The table asks for one page; the chips ask for counts. Neither pulls the
  // whole catalogue the way this page used to.
  const [products, counts] = await Promise.all([
    getAdminProducts({
      search,
      status: filter === "active" || filter === "draft" ? filter : undefined,
      stock: filter === "low" || filter === "out" ? filter : undefined,
      page,
    }),
    getAdminProductCounts(search),
  ]);

  return (
    <>
      <DashboardTopbar
        title="Products"
        subtitle={`${counts.all} products · ${counts.active} active`}
        actions={
          <Button asChild size="lg" className="h-10 text-xs font-semibold">
            <Link href="/dashboard/products/new">
              <Plus />
              Add product
            </Link>
          </Button>
        }
      />

      <div className="px-5 py-6 lg:px-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <FilterChips
            active={filter}
            basePath="/dashboard/products"
            extraParams={{ q: search || undefined }}
            chips={[
              { label: "All", value: "", count: counts.all },
              { label: "Active", value: "active", count: counts.active },
              { label: "Draft", value: "draft", count: counts.draft },
              { label: "Low stock", value: "low", count: counts.low },
              { label: "Out of stock", value: "out", count: counts.out },
            ]}
          />
          <AdminSearch
            basePath="/dashboard/products"
            placeholder="Search products…"
            defaultValue={search}
            extraParams={{ filter: filter || undefined }}
          />
        </div>

        {products.rows.length === 0 ? (
          <EmptyPanelState
            icon={<Package />}
            title={search ? "Nothing matched that search" : "No products here yet"}
            body={
              search
                ? "Try a shorter word, or clear the filter."
                : "Add your first piece and it will appear on the storefront the moment you publish it."
            }
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-line bg-paper">
            <ProductTable products={products.rows} />
            <TablePagination
              page={products.page}
              totalPages={products.totalPages}
              total={products.total}
              perPage={products.perPage}
              basePath="/dashboard/products"
              params={{ filter: filter || undefined, q: search || undefined }}
              label="products"
            />
          </div>
        )}
      </div>
    </>
  );
}
