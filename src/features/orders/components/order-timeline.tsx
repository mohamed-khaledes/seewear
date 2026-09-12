import { Check } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  ORDER_TIMELINE,
  orderStatusMeta,
  timelineIndex,
  type OrderStatus,
} from "@/features/orders/services/utils/status";

export function OrderTimeline({ status }: { status: OrderStatus }) {
  if (status === "cancelled" || status === "refunded") {
    return (
      <div className="rounded-lg border border-line bg-concrete px-4 py-3.5">
        <p className="up-xs text-grey-2">{orderStatusMeta[status].label}</p>
        <p className="mt-1.5 text-sm text-grey-2">{orderStatusMeta[status].blurb}</p>
      </div>
    );
  }

  const current = timelineIndex(status);

  return (
    <ol className="grid gap-0">
      {ORDER_TIMELINE.map((step, index) => {
        const done = index <= current;
        const last = index === ORDER_TIMELINE.length - 1;

        return (
          <li key={step.status} className="flex gap-3.5">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "grid size-6 shrink-0 place-items-center rounded-full border",
                  done ? "border-ink bg-ink text-white" : "border-line bg-white",
                )}
              >
                {done ? <Check className="size-3" /> : null}
              </span>
              {!last ? (
                <span
                  className={cn(
                    "w-px flex-1",
                    index < current ? "bg-ink" : "bg-line",
                  )}
                />
              ) : null}
            </div>

            <div className={cn("pb-6", last && "pb-0")}>
              <p
                className={cn(
                  "text-sm font-semibold",
                  done ? "text-ink" : "text-grey",
                )}
              >
                {step.label}
              </p>
              {index === current ? (
                <p className="mt-1 text-xs text-grey-2">
                  {orderStatusMeta[status].blurb}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
