"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Printer } from "lucide-react";
import { toast } from "sonner";

import { StatusPill } from "@/components/common/status-pill";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime, formatMoney } from "@/lib/utils";
import { canMoveOrder, COURIERS, orderStatusMeta } from "@/features/orders";
import { useDemoGuard } from "@/features/dashboard/hooks/use-demo-guard";
import { bulkAdvanceOrdersAction } from "@/features/dashboard/services/api/order-actions";
import {
  BULK_ORDER_LIMIT,
  type AdminOrderRow,
  type BulkOrderTarget,
} from "@/features/dashboard/types";

/**
 * The orders table, with the Friday-afternoon actions on top of it: tick the
 * parcels that went out together, pick the courier, mark them all shipped.
 *
 * What the buttons offer is worked out from the rows themselves, using the same
 * flow the single-order form obeys — so "Mark shipped" only appears when
 * something in the selection is actually waiting to ship, and a selection of
 * cancelled orders offers nothing at all. The server checks every move again;
 * this is the courtesy, not the control.
 */
export function OrderTable({ orders }: { orders: AdminOrderRow[] }) {
  const router = useRouter();
  const { guard } = useDemoGuard();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [courier, setCourier] = useState<string>("");

  // Only ids still on this page count: paging or filtering must never carry a
  // hidden selection into the next bulk action.
  const chosen = orders.filter((order) => selected.has(order.id));
  const allChecked = orders.length > 0 && chosen.length === orders.length;

  const shippable = chosen.filter((order) => canMoveOrder(order.status, "fulfilled")).length;
  const deliverable = chosen.filter((order) => canMoveOrder(order.status, "delivered")).length;

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function bulk(target: BulkOrderTarget) {
    const ids = chosen.map((order) => order.id);
    guard(() =>
      startTransition(async () => {
        const result = await bulkAdvanceOrdersAction(ids, target, courier || undefined);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        const { moved = 0, skipped = 0 } = result.data ?? {};
        toast.success(
          `${moved} ${moved === 1 ? "order" : "orders"} marked ${
            target === "fulfilled" ? "shipped" : "delivered"
          }`,
          skipped > 0
            ? { description: `${skipped} left alone — not at that step yet.` }
            : undefined,
        );
        setSelected(new Set());
        router.refresh();
      }),
    );
  }

  const slipsHref = `/dashboard/orders/packing-slips?ids=${chosen
    .slice(0, BULK_ORDER_LIMIT)
    .map((order) => order.id)
    .join(",")}`;

  return (
    <>
      {chosen.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3 border-b border-line bg-concrete px-4 py-2.5">
          <span className="text-xs font-semibold tabular-nums">
            {chosen.length} selected
          </span>

          {shippable > 0 ? (
            <Select value={courier} onValueChange={setCourier}>
              <SelectTrigger size="sm" className="h-8 w-[150px] bg-paper text-xs">
                <SelectValue placeholder="Courier (optional)" />
              </SelectTrigger>
              <SelectContent>
                {COURIERS.map((entry) => (
                  <SelectItem key={entry.name} value={entry.name}>
                    {entry.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}

          {shippable > 0 ? (
            <Button
              size="sm"
              disabled={pending}
              onClick={() => bulk("fulfilled")}
              className="text-xs"
            >
              Mark {shippable} shipped
            </Button>
          ) : null}

          {deliverable > 0 ? (
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => bulk("delivered")}
              className="text-xs"
            >
              Mark {deliverable} delivered
            </Button>
          ) : null}

          <Button size="sm" variant="outline" asChild className="text-xs">
            <Link href={slipsHref} target="_blank">
              <Printer className="size-3.5" />
              Packing slips
            </Link>
          </Button>

          {pending ? <Loader2 className="size-3.5 animate-spin text-grey" /> : null}

          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="ms-auto text-xs text-grey-2 hover:text-ink"
          >
            Clear
          </button>
        </div>
      ) : null}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox
                aria-label="Select every order on this page"
                checked={allChecked}
                onCheckedChange={(checked) =>
                  setSelected(
                    checked === true ? new Set(orders.map((order) => order.id)) : new Set(),
                  )
                }
              />
            </TableHead>
            <TableHead>Order</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead className="hidden md:table-cell">Placed</TableHead>
            <TableHead className="hidden sm:table-cell">Items</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => {
            const meta = orderStatusMeta[order.status];
            const picked = selected.has(order.id);
            return (
              <TableRow key={order.id} data-state={picked ? "selected" : undefined}>
                <TableCell>
                  <Checkbox
                    aria-label={`Select order ${order.order_number}`}
                    checked={picked}
                    onCheckedChange={() => toggle(order.id)}
                  />
                </TableCell>
                <TableCell className="font-bold tabular-nums">
                  <Link href={`/dashboard/orders/${order.id}`} className="hover:underline">
                    {order.order_number}
                  </Link>
                  {order.payment_method === "cod" ? (
                    <span className="ms-2 align-middle text-[10px] font-semibold uppercase tracking-[0.12em] text-grey">
                      Cash
                    </span>
                  ) : null}
                </TableCell>
                <TableCell>
                  <span className="block text-[12.5px] font-semibold">{order.customer}</span>
                  <span className="text-[11px] text-grey">{order.email}</span>
                </TableCell>
                <TableCell className="hidden text-xs text-grey-2 md:table-cell">
                  {formatDateTime(order.created_at)}
                </TableCell>
                <TableCell className="hidden tabular-nums sm:table-cell">
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
    </>
  );
}
