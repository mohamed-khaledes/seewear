import Link from "next/link";
import { Package } from "lucide-react";

import { ProductShot } from "@/components/common/product-shot";
import { StatusPill } from "@/components/common/status-pill";
import { Button } from "@/components/ui/button";
import { formatDate, formatMoney } from "@/lib/utils";
import { getMyOrders } from "@/features/orders/services/api/orders.server";
import { orderStatusMeta } from "@/features/orders/services/utils/status";

export async function OrdersPage() {
  const orders = await getMyOrders();

  return (
    <div className="bg-concrete">
      <div className="border-b border-line bg-paper px-5 pb-6 pt-9 lg:px-6">
        <p className="up-xs text-grey-2">Account</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight lg:text-3xl">Orders</h1>
      </div>

      {orders.length === 0 ? (
        <div className="bg-paper px-6 py-24 text-center">
          <Package className="mx-auto size-8 text-grey" strokeWidth={1.3} />
          <h2 className="mt-4 text-base font-semibold">No orders yet</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-grey-2">
            They will show up here once you check out.
          </p>
          <Button asChild size="lg" className="up-sm mt-6 h-12 px-8 font-semibold">
            <Link href="/products">Start shopping</Link>
          </Button>
        </div>
      ) : (
        <div className="mx-auto max-w-4xl px-5 py-8 lg:px-6">
          <ul className="grid gap-4">
            {orders.map((order) => {
              const meta = orderStatusMeta[order.status];
              const itemCount = order.items.reduce(
                (count, item) => count + item.quantity,
                0,
              );

              return (
                <li key={order.id}>
                  <Link
                    href={`/account/orders/${order.order_number}`}
                    className="block border border-line bg-paper p-5 transition-colors hover:border-ink"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold tabular-nums">
                          {order.order_number}
                        </p>
                        <p className="up-xs mt-1 text-grey-2">
                          {formatDate(order.created_at)} · {itemCount}{" "}
                          {itemCount === 1 ? "item" : "items"}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusPill tone={meta.tone}>{meta.label}</StatusPill>
                        <span className="text-sm font-bold tabular-nums">
                          {formatMoney(order.total_cents)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {order.items.slice(0, 5).map((item, index) => (
                        <div
                          key={index}
                          className="w-12 overflow-hidden rounded border border-line bg-white"
                        >
                          <ProductShot
                            src={item.image_url}
                            alt={item.name}
                            sizes="48px"
                            className="aspect-square"
                            imageClassName="p-1"
                          />
                        </div>
                      ))}
                      {order.items.length > 5 ? (
                        <span className="up-xs grid size-12 place-items-center rounded border border-line text-grey-2">
                          +{order.items.length - 5}
                        </span>
                      ) : null}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
