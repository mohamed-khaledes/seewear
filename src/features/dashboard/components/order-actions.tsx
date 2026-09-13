"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Loader2, RotateCcw, XCircle } from "lucide-react";
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
import { formatMoney } from "@/lib/utils";
import { useDemoGuard } from "@/features/dashboard/hooks/use-demo-guard";
import {
  cancelOrderAction,
  refundOrderAction,
} from "@/features/dashboard/services/api/order-actions";
import type { ActionResult } from "@/features/dashboard/types";

export function OrderActions({
  orderId,
  status,
  totalCents,
}: {
  orderId: string;
  status: string;
  totalCents: number;
}) {
  const router = useRouter();
  const { guard } = useDemoGuard();
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<ActionResult>, success: string) {
    guard(() =>
      startTransition(async () => {
        const result = await action();
        if (result.ok) {
          toast.success(success);
          router.refresh();
        } else {
          toast.error(result.error);
        }
      }),
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {pending ? <Loader2 className="size-4 animate-spin text-grey" /> : null}

      {status === "pending" ? (
        <Button
          variant="outline"
          size="lg"
          className="h-10 text-xs font-semibold"
          disabled={pending}
          onClick={() => run(() => cancelOrderAction(orderId), "Order cancelled")}
        >
          <XCircle />
          Cancel order
        </Button>
      ) : null}

      {status === "paid" || status === "fulfilled" || status === "delivered" ? (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              size="lg"
              className="h-10 text-xs font-semibold"
              disabled={pending}
            >
              <RotateCcw />
              Refund
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Refund {formatMoney(totalCents)}?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This sends the full amount back through Paymob to the original card.
                Stock is not restocked automatically — check the return in first.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep the payment</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => run(() => refundOrderAction(orderId), "Refund sent")}
              >
                Refund
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </div>
  );
}
