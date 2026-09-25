"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Search } from "lucide-react";

import { ProductShot } from "@/components/common/product-shot";
import { StatusPill } from "@/components/common/status-pill";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/utils";
import { OrderTimeline } from "@/features/orders/components/order-timeline";
import { trackOrderAction } from "@/features/orders/services/api/track-actions";
import { useT } from "@/lib/i18n";
import { orderStatusMeta, statusLabel } from "@/features/orders/services/utils/status";
import {
  trackOrderSchema,
  type TrackedOrder,
  type TrackOrderValues,
} from "@/features/orders/types";

/**
 * Order lookup for someone who checked out as a guest.
 *
 * Both fields are required and the server answers the same way whichever one is
 * wrong, so this cannot be walked through the order-number sequence.
 */
export function TrackOrderForm({ defaultOrderNumber = "" }: { defaultOrderNumber?: string }) {
  const t = useT();
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [searching, setSearching] = useState(false);

  const form = useForm<TrackOrderValues>({
    resolver: zodResolver(trackOrderSchema),
    defaultValues: { orderNumber: defaultOrderNumber, email: "" },
  });

  async function onSubmit(values: TrackOrderValues) {
    setSearching(true);
    try {
      const result = await trackOrderAction(values);
      if (result.ok) {
        setOrder(result.order);
      } else {
        form.setError("orderNumber", { message: result.error });
      }
    } catch {
      form.setError("orderNumber", {
        message: t("track.error"),
      });
    } finally {
      setSearching(false);
    }
  }

  if (order) {
    return <TrackedOrderView order={order} onReset={() => setOrder(null)} />;
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="grid gap-5 border border-line bg-paper p-6 lg:p-8"
      >
        <FormField
          control={form.control}
          name="orderNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="up-xs text-grey-2">{t("track.orderNumber")}</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="SW-4821"
                  autoComplete="off"
                  className="h-12 font-mono tabular-nums"
                />
              </FormControl>
              <FormDescription className="text-xs text-grey">
                {t("track.orderHint")}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="up-xs text-grey-2">{t("common.email")}</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="email"
                  autoComplete="email"
                  placeholder={t("common.emailPlaceholder")}
                  className="h-12"
                />
              </FormControl>
              <FormDescription className="text-xs text-grey">
                {t("track.emailHint")}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          size="lg"
          disabled={searching}
          className="up-sm h-12 justify-center font-semibold"
        >
          {searching ? <Loader2 className="animate-spin" /> : <Search />}
          {searching ? t("track.looking") : t("track.find")}
        </Button>
      </form>
    </Form>
  );
}

function TrackedOrderView({
  order,
  onReset,
}: {
  order: TrackedOrder;
  onReset: () => void;
}) {
  const t = useT();
  const meta = orderStatusMeta[order.status];

  return (
    <div className="grid gap-5">
      <section className="border border-line bg-paper p-6 lg:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="up-xs text-grey-2">{t("track.orderNumber")}</p>
            <h2 className="mt-1.5 text-2xl font-bold tabular-nums tracking-tight">
              {order.orderNumber}
            </h2>
            <p className="up-xs mt-2 text-grey">
              {t("track.placedOn", { date: formatDate(order.createdAt) })}
              {order.shippingTo ? ` · ${order.shippingTo}` : ""}
            </p>
          </div>
          <StatusPill tone={meta.tone}>{statusLabel(t, order.status)}</StatusPill>
        </div>

        <div className="mt-7 border-t border-line pt-7">
          <OrderTimeline
            status={order.status}
            paymentMethod={order.paymentMethod}
            events={order.events}
            courier={order.courier}
            trackingNumber={order.trackingNumber}
            trackingUrl={order.trackingUrl}
            t={t}
          />
        </div>
      </section>

      <section className="border border-line bg-paper p-6 lg:p-8">
        <h3 className="up-sm mb-4 text-grey-2">{t("track.inThisOrder")}</h3>
        <ul className="divide-y divide-line">
          {order.items.map((item, index) => (
            <li key={index} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
              <div className="w-14 shrink-0 overflow-hidden rounded border border-line bg-white">
                <ProductShot
                  src={item.imageUrl}
                  alt={item.name}
                  sizes="56px"
                  className="aspect-[1/1.08]"
                  imageClassName="p-1.5"
                />
              </div>
              <div className="min-w-0 flex-1">
                {item.slug ? (
                  <Link
                    href={`/product/${item.slug}`}
                    className="text-sm font-semibold hover:underline"
                  >
                    {item.name}
                  </Link>
                ) : (
                  <p className="text-sm font-semibold">{item.name}</p>
                )}
                <p className="up-xs mt-1 text-grey-2">
                  {[item.color, item.size].filter(Boolean).join(" · ") || t("common.oneSize")}{" "}
                  · {t("track.qty", { count: item.quantity })}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={onReset}
          className="up-sm h-12 font-semibold"
        >
          {t("track.trackAnother")}
        </Button>
        <Button asChild size="lg" variant="ghost" className="up-sm h-12 font-semibold">
          <Link href="/help/contact">{t("track.somethingWrong")}</Link>
        </Button>
      </div>
    </div>
  );
}
