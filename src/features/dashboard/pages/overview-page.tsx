import Link from "next/link";

import { ProductShot } from "@/components/common/product-shot";
import { StatusPill } from "@/components/common/status-pill";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMoney } from "@/lib/utils";
import { orderStatusMeta } from "@/features/orders";
import { KpiCard } from "@/features/dashboard/components/kpi-card";
import { Panel } from "@/features/dashboard/components/panel";
import { RevenueChart } from "@/features/dashboard/components/revenue-chart";
import { DashboardTopbar } from "@/features/dashboard/components/dashboard-topbar";
import { getDashboardStats } from "@/features/dashboard/services/api/dashboard.server";

export async function OverviewPage() {
  const stats = await getDashboardStats(30);
  const topRevenue = Math.max(
    ...stats.top_products.map((product) => product.revenue_cents),
    1,
  );

  return (
    <>
      <DashboardTopbar
        title="Overview"
        subtitle={`Store performance · Last ${stats.range_days} days`}
      />

      <div className="grid gap-4 px-5 py-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Revenue"
            value={formatMoney(stats.revenue_cents)}
            current={stats.revenue_cents}
            previous={stats.previous_revenue_cents}
          />
          <KpiCard
            label="Orders"
            value={String(stats.orders_count)}
            current={stats.orders_count}
            previous={stats.previous_orders_count}
          />
          <KpiCard
            label="Avg. order value"
            value={formatMoney(stats.aov_cents)}
            current={stats.aov_cents}
            previous={stats.previous_aov_cents}
          />
          <KpiCard
            label="Checkout completion"
            value={`${Number(stats.completion_rate).toFixed(1)}%`}
            current={Number(stats.completion_rate)}
            previous={Number(stats.previous_completion_rate)}
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.55fr_1fr]">
          <Panel title="Revenue" note={`Daily · last ${stats.range_days} days`}>
            <RevenueChart series={stats.series} />
          </Panel>

          <Panel title="Top products" note="By revenue">
            {stats.top_products.length === 0 ? (
              <p className="py-6 text-center text-sm text-grey-2">
                No sales in this window yet.
              </p>
            ) : (
              <ul>
                {stats.top_products.map((product) => (
                  <li
                    key={product.product_id ?? product.name}
                    className="flex items-center gap-3.5 border-b border-line py-3 last:border-0"
                  >
                    <div className="w-10 shrink-0 overflow-hidden rounded-md border border-line bg-[#f4f4f2]">
                      <ProductShot
                        src={product.image_url}
                        alt={product.name}
                        sizes="40px"
                        className="aspect-[1/1.1]"
                        imageClassName="p-1"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-semibold">
                        {product.name}
                      </p>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded bg-[#eee]">
                        <div
                          className="h-full rounded bg-ink"
                          style={{
                            width: `${Math.round((product.revenue_cents / topRevenue) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                    <span className="text-xs font-semibold tabular-nums">
                      {formatMoney(product.revenue_cents)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.55fr_1fr]">
          <Panel title="Recent orders" href="/dashboard/orders" bodyClassName="p-0">
            {stats.recent_orders.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-grey-2">
                No orders yet — they will show up here once customers check out.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="hidden sm:table-cell">Items</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.recent_orders.map((order) => {
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
                        <TableCell>{order.customer}</TableCell>
                        <TableCell className="hidden sm:table-cell">
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
            )}
          </Panel>

          <Panel title="Running low" note="5 or fewer left">
            {stats.low_stock.length === 0 ? (
              <p className="py-6 text-center text-sm text-grey-2">
                Nothing is close to selling out.
              </p>
            ) : (
              <ul className="grid gap-2.5">
                {stats.low_stock.map((variant, index) => (
                  <li
                    key={`${variant.slug}-${index}`}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/product/${variant.slug}`}
                        className="block truncate font-semibold hover:underline"
                      >
                        {variant.name}
                      </Link>
                      <span className="up-xs text-grey-2">
                        {[variant.color, variant.size].filter(Boolean).join(" · ")}
                      </span>
                    </div>
                    <span
                      className={
                        variant.stock === 0
                          ? "text-xs font-semibold text-sale"
                          : "text-xs font-semibold text-warn"
                      }
                    >
                      {variant.stock === 0 ? "Out" : `${variant.stock} left`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
