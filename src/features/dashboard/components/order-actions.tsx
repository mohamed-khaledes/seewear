"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, PackagePlus, Printer, RefreshCw, RotateCcw, Truck, XCircle } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney, toPiastres } from "@/lib/utils";
import {
  canCancel,
  canMoveOrder,
  canRefund,
  type OrderStatus,
  type PaymentMethod,
} from "@/features/orders";
import { useDemoGuard } from "@/features/dashboard/hooks/use-demo-guard";
import {
  bookShipmentAction,
  cancelOrderAction,
  checkPaymentAction,
  refundOrderAction,
  restockOrderAction,
  shipmentLabelAction,
} from "@/features/dashboard/services/api/order-actions";
import type { ActionResult } from "@/features/dashboard/types";

export function OrderActions({
  orderId,
  status,
  paymentMethod,
  totalCents,
  refundedCents,
  stockHeld,
  courierLabel,
  shipmentId,
}: {
  orderId: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  totalCents: number;
  refundedCents: number;
  stockHeld: boolean;
  /** The courier this deployment books with, or null when none is connected. */
  courierLabel: string | null;
  /** The courier's own reference, once this parcel has been booked. */
  shipmentId: string | null;
}) {
  const router = useRouter();
  const { guard } = useDemoGuard();
  const [pending, startTransition] = useTransition();
  const [reason, setReason] = useState("");
  const remaining = totalCents - refundedCents;
  const [refundEgp, setRefundEgp] = useState((remaining / 100).toFixed(2));

  function run<T>(action: () => Promise<ActionResult<T>>, success: string | ((data?: T) => string)) {
    guard(() =>
      startTransition(async () => {
        const result = await action();
        if (result.ok) {
          toast.success(typeof success === "function" ? success(result.data) : success);
          router.refresh();
        } else {
          toast.error(result.error);
        }
      }),
    );
  }

  const refused = status === "fulfilled" && paymentMethod === "cod";
  const button = "h-10 text-xs font-semibold";
  const collect = paymentMethod === "cod" ? remaining : 0;

  /**
   * The label opens from a toast rather than straight from the action: the URL
   * only exists after the round trip to the courier, and a window opened
   * without a click behind it is what browsers block.
   */
  function printLabel() {
    startTransition(async () => {
      const result = await shipmentLabelAction(orderId);
      if (!result.ok || !result.data) {
        toast.error(result.ok ? "The courier did not return a label." : result.error);
        return;
      }
      const url = result.data;
      toast.success("Airway bill ready", {
        action: { label: "Open", onClick: () => window.open(url, "_blank", "noopener") },
        duration: 12_000,
      });
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {pending ? <Loader2 className="size-4 animate-spin text-grey" /> : null}

      {courierLabel && !shipmentId && canMoveOrder(status, "fulfilled") ? (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="lg" className={button} disabled={pending}>
              <Truck />
              Book with {courierLabel}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Hand this parcel to {courierLabel}?</AlertDialogTitle>
              <AlertDialogDescription>
                {collect > 0
                  ? `The courier will be told to collect ${formatMoney(collect)} at the door.`
                  : "This order is already paid, so the courier collects nothing."}{" "}
                The order is marked shipped and the customer gets the tracking
                number by email.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Not yet</AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  run(
                    () => bookShipmentAction(orderId),
                    (tracking) => `Booked with ${courierLabel} · ${tracking ?? ""}`,
                  )
                }
              >
                Book it
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}

      {courierLabel && shipmentId ? (
        <Button
          variant="outline"
          size="lg"
          className={button}
          disabled={pending}
          onClick={printLabel}
        >
          <Printer />
          Airway bill
        </Button>
      ) : null}

      {status === "pending" && paymentMethod === "card" ? (
        <Button
          variant="outline"
          size="lg"
          className={button}
          disabled={pending}
          onClick={() =>
            run(() => checkPaymentAction(orderId), (message) => message ?? "Checked with Paymob")
          }
        >
          <RefreshCw />
          Check with Paymob
        </Button>
      ) : null}

      {canCancel(status, paymentMethod) ? (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="lg" className={button} disabled={pending}>
              <XCircle />
              {refused ? "Mark refused" : "Cancel order"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {refused ? "Parcel refused at the door?" : "Cancel this order?"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {refused
                  ? "The order is cancelled and its pieces go back on sale. Check the parcel in when the courier returns it."
                  : "Its pieces go straight back on sale and the customer is emailed. Nothing was charged, so there is nothing to refund."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="grid gap-1.5">
              <Label htmlFor="cancel-reason" className="up-xs text-grey-2">
                Reason for the customer (optional)
              </Label>
              <Input
                id="cancel-reason"
                value={reason}
                maxLength={200}
                onChange={(event) => setReason(event.target.value)}
                placeholder={refused ? "Refused on delivery" : "Out of stock after a stock count"}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep the order</AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  run(() => cancelOrderAction(orderId, reason), "Order cancelled, stock returned")
                }
              >
                {refused ? "Mark refused" : "Cancel order"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}

      {canRefund(status, paymentMethod, refundedCents, totalCents) ? (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="lg" className={button} disabled={pending}>
              <RotateCcw />
              Refund
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Refund this order</AlertDialogTitle>
              <AlertDialogDescription>
                {paymentMethod === "card"
                  ? "Sent back through Paymob to the original card."
                  : "This was paid in cash, so return the money yourself — this records it and emails the customer."}{" "}
                {refundedCents > 0
                  ? `${formatMoney(refundedCents)} has already been refunded. `
                  : ""}
                Stock is not restocked here; restock once the return is checked in.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="grid gap-1.5">
              <Label htmlFor="refund-amount" className="up-xs text-grey-2">
                Amount (EGP) · up to {formatMoney(remaining)}
              </Label>
              <Input
                id="refund-amount"
                type="number"
                min={0.01}
                step="0.01"
                max={remaining / 100}
                value={refundEgp}
                onChange={(event) => setRefundEgp(event.target.value)}
                className="tabular-nums"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Not now</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  const cents = toPiastres(Number(refundEgp) || 0);
                  run(
                    () => refundOrderAction(orderId, cents),
                    `${formatMoney(cents)} refunded`,
                  );
                }}
              >
                Refund {formatMoney(toPiastres(Number(refundEgp) || 0))}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}

      {status === "refunded" && stockHeld ? (
        <Button
          variant="outline"
          size="lg"
          className={button}
          disabled={pending}
          onClick={() => run(() => restockOrderAction(orderId), "Pieces are back in stock")}
        >
          <PackagePlus />
          Restock returned items
        </Button>
      ) : null}
    </div>
  );
}
