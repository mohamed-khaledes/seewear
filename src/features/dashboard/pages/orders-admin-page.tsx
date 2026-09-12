import Link from "next/link";
import { Receipt } from "lucide-react";

import { StatusPill } from "@/components/common/status-pill";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime, formatMoney } from "@/lib/utils";
import { orderStatusMeta } from "@/features/orders";
import { DashboardTopbar } from "@/features/dashboard/components/dashboard-topbar";
import { EmptyPanelState } from "@/features/dashboard/components/panel";
import { FilterChips } from "@/features/dashboard/components/filter-chips";
import {
  getAdminOrderCounts,
  getAdminOrders,
} from "@/features/dashboard/services/api/dashboard.server";
import { TablePagination } from "@/features/dashboard/components/table-pagination";

const CHIPS = [
  { label: "All", value: "" },
  { label: "Awaiting payment", value: "pending" },
  { label: "To fulfil", value: "unfulfilled" },
  { label: "Fulfilled", value: "fulfilled" },
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
  const needFulfilment = counts.paid ?? 0;

  return (
    <>
      <DashboardTopbar
        title="Orders"
        subtitle={`${counts.all ?? 0} orders · ${needFulfilment} need fulfilment`}
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="hidden md:table-cell">Placed</TableHead>
                  <TableHead className="hidden sm:table-cell">Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.rows.map((order) => {
                  const meta = orderStatusMeta[order.status];
                  return (
                    <TableRow key={order.id}>
                      <TableCell className="font-bold tabular-nums">
                        <Link
                          href={`/dashboard/orders/${order.id}`}
                          className="hover:underline"
                        >
                          {order.order_number}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <span className="block text-[12.5px] font-semibold">
                          {order.customer}
                        </span>
                        <span className="text-[11px] text-grey">{order.email}</span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-grey-2">
                        {formatDateTime(order.created_at)}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell tabular-nums">
                        {order.item_count}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {formatMoney(order.total_cents)}
                      </TableCell>
                      <TableCell>
                        <StatusPill tone={meta.tone}>{meta.label}</StatusPill>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
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
