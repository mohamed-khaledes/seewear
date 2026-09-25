import { Receipt } from "lucide-react";

import { DashboardTopbar } from "@/features/dashboard/components/dashboard-topbar";
import { EmptyPanelState } from "@/features/dashboard/components/panel";
import { ExportForm } from "@/features/dashboard/components/export-form";
import { FilterChips } from "@/features/dashboard/components/filter-chips";
import { OrderTable } from "@/features/dashboard/components/order-table";
import {
  getAdminOrderCounts,
  getAdminOrders,
} from "@/features/dashboard/services/api/dashboard.server";
import { TablePagination } from "@/features/dashboard/components/table-pagination";

const CHIPS = [
  { label: "All", value: "" },
  { label: "Awaiting payment", value: "pending" },
  { label: "To fulfil", value: "unfulfilled" },
  { label: "Shipped", value: "fulfilled" },
  { label: "Delivered", value: "delivered" },
  { label: "Refunded", value: "refunded" },
  { label: "Cancelled", value: "cancelled" },
];

export async function OrdersAdminPage({
  searchParams,
}: {
  searchParams: { filter?: string; page?: string };
}) {
  const filter = CHIPS.some((chip) => chip.value === searchParams.filter)
    ? (searchParams.filter ?? "")
    : "";

  // One page of rows, and the chip counts separately — the table no longer
  // fetches every order just to render twenty.
  const [orders, counts] = await Promise.all([
    getAdminOrders(filter || "all", Number(searchParams.page ?? 1)),
    getAdminOrderCounts(),
  ]);
  const needFulfilment = counts.unfulfilled ?? 0;

  return (
    <>
      <DashboardTopbar
        title="Orders"
        subtitle={`${counts.all ?? 0} orders · ${needFulfilment} need fulfilment`}
        actions={<ExportForm action="/dashboard/orders/export" label="Export CSV" />}
      />

      <div className="px-5 py-6 lg:px-8">
        <FilterChips
          chips={CHIPS.map((chip) => ({ ...chip, count: counts[chip.value || "all"] }))}
          active={filter}
          basePath="/dashboard/orders"
        />

        {orders.rows.length === 0 ? (
          <EmptyPanelState
            icon={<Receipt />}
            title="No orders here"
            body="They will show up the moment a customer checks out."
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-line bg-paper">
            <OrderTable orders={orders.rows} />
            <TablePagination
              page={orders.page}
              totalPages={orders.totalPages}
              total={orders.total}
              perPage={orders.perPage}
              basePath="/dashboard/orders"
              params={{ filter: filter || undefined }}
              label="orders"
            />
          </div>
        )}
      </div>
    </>
  );
}
