import Link from "next/link";
import { AlertTriangle, Shapes } from "lucide-react";

import { DashboardTopbar } from "@/features/dashboard/components/dashboard-topbar";
import { CategoriesManager } from "@/features/dashboard/components/categories-manager";
import { EmptyPanelState } from "@/features/dashboard/components/panel";
import { getAdminCategoryRows } from "@/features/dashboard/services/api/dashboard.server";

export async function CategoriesAdminPage() {
  const { rows, uncategorised } = await getAdminCategoryRows();
  const live = rows.filter((category) => category.active_count > 0).length;

  return (
    <>
      <DashboardTopbar
        title="Categories"
        subtitle={`${rows.length} categories · ${live} with live products`}
      />

      <div className="grid gap-4 px-5 py-6 lg:px-8">
        {uncategorised > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-warn/30 bg-warn-bg px-5 py-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warn" />
              <div>
                <p className="text-[12.5px] font-semibold">
                  {uncategorised} product{uncategorised === 1 ? "" : "s"} without a
                  category
                </p>
                <p className="mt-0.5 text-[11px] text-grey-2">
                  They still sell, but nobody browsing a category will meet them.
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/products"
              className="up-xs shrink-0 border-b border-ink pb-0.5 font-semibold"
            >
              Open products
            </Link>
          </div>
        ) : null}

        {rows.length === 0 ? (
          <div className="grid gap-4">
            <CategoriesManager categories={[]} />
            <EmptyPanelState
              icon={<Shapes />}
              title="No categories yet"
              body="Add one and it becomes a filter on the storefront and a choice on the product form."
            />
          </div>
        ) : (
          <CategoriesManager categories={rows} />
        )}
      </div>
    </>
  );
}
