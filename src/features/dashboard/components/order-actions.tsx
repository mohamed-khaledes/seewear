"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, PackagePlus, RefreshCw, RotateCcw, XCircle } from "lucide-react";
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
  canRefund,
  type OrderStatus,
  type PaymentMethod,
} from "@/features/orders";
import { useDemoGuard } from "@/features/dashboard/hooks/use-demo-guard";
import {
  cancelOrderAction,
  checkPaymentAction,
  refundOrderAction,
  restockOrderAction,
} from "@/features/dashboard/services/api/order-actions";
import type { ActionResult } from "@/features/dashboard/types";

export function OrderActions({
  orderId,
  status,
  paymentMethod,
  totalCents,
  refundedCents,
  stockHeld,
}: {
  orderId: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  totalCents: number;
  refundedCents: number;
  stockHeld: boolean;
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

  return (
    <div className="flex flex-wrap items-center gap-2">
      {pending ? <Loader2 className="size-4 animate-spin text-grey" /> : null}

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
