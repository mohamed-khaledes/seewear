import { Check, Truck } from "lucide-react";

import { cn, formatDateTime } from "@/lib/utils";
import type { Translator } from "@/lib/i18n";
import {
  statusBlurb,
  statusLabel,
  timelineFor,
  timelineIndex,
  type OrderStatus,
  type PaymentMethod,
} from "@/features/orders/services/utils/status";

export type TimelineEvent = {
  status: OrderStatus;
  note: string | null;
  createdAt: string;
};

/**
 * Where the order is, and when each step happened.
 *
 * The dates come from `order_events`, written by a database trigger on every
 * status change — so the timeline reports what actually happened rather than
 * what the current status implies. With no events it still renders: an order
 * from before tracking existed simply shows its steps undated.
 */
export function OrderTimeline({
  status,
  paymentMethod = "card",
  events = [],
  courier,
  trackingNumber,
  trackingUrl,
  t,
}: {
  status: OrderStatus;
  paymentMethod?: PaymentMethod;
  events?: TimelineEvent[];
  courier?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  t: Translator;
}) {
  const stampFor = (step: OrderStatus) =>
    events.find((event) => event.status === step) ?? null;

  const tracking =
    trackingNumber || trackingUrl ? (
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-concrete px-4 py-3.5">
        <div className="flex items-center gap-3">
          <Truck className="size-4 shrink-0 text-grey-2" strokeWidth={1.6} />
          <div>
            <p className="up-xs text-grey-2">{courier ?? t("timeline.courier")}</p>
            {trackingNumber ? (
              <p className="mt-0.5 font-mono text-[13px] font-semibold tabular-nums">
                {trackingNumber}
              </p>
            ) : null}
          </div>
        </div>
        {trackingUrl ? (
          <a
            href={trackingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="up-xs border-b border-ink pb-0.5 font-semibold transition-opacity hover:opacity-60"
          >
            {t("track.trackParcel")}
          </a>
        ) : null}
      </div>
    ) : null;

  if (status === "cancelled" || status === "refunded") {
    const ended = stampFor(status);

    return (
      <div>
        <div className="rounded-lg border border-line bg-concrete px-4 py-3.5">
          <p className="up-xs text-grey-2">{statusLabel(t, status)}</p>
          <p className="mt-1.5 text-sm text-grey-2">{statusBlurb(t, status)}</p>
          {ended ? (
            <p className="up-xs mt-2 text-grey">{formatDateTime(ended.createdAt)}</p>
          ) : null}
        </div>

        {events.length > 1 ? (
          <ol className="mt-4 grid gap-2 border-t border-line pt-4">
            {events.map((event, index) => (
              <li
                key={`${event.status}-${index}`}
                className="flex flex-wrap justify-between gap-2 text-xs text-grey-2"
              >
                <span>{statusLabel(t, event.status)}</span>
                <span className="tabular-nums">{formatDateTime(event.createdAt)}</span>
              </li>
            ))}
          </ol>
        ) : null}
      </div>
    );
  }

  const steps = timelineFor(paymentMethod);
  const current = timelineIndex(status, paymentMethod);

  return (
    <div>
      <ol className="grid gap-0">
        {steps.map((step, index) => {
          const done = index <= current;
          const last = index === steps.length - 1;
          const stamp = stampFor(step.status);

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
                    className={cn("w-px flex-1", index < current ? "bg-ink" : "bg-line")}
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
                  {t(step.label)}
                </p>

                {stamp ? (
                  <p className="up-xs mt-1 text-grey">
                    {formatDateTime(stamp.createdAt)}
                  </p>
                ) : null}

                {index === current ? (
                  <p className="mt-1 text-xs text-grey-2">
                    {stamp?.note ?? t(step.waiting)}
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>

      {tracking}
    </div>
  );
}
