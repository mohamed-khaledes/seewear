"use client";

import { useRouter } from "next/navigation";
import { useRef, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  carriesTracking,
  COURIERS,
  ORDER_STATUS_FLOW,
  orderStatusMeta,
  trackingUrlFor,
  type OrderStatus,
} from "@/features/orders";
import { useDemoGuard } from "@/features/dashboard/hooks/use-demo-guard";
import { updateOrderStatusAction } from "@/features/dashboard/services/api/order-actions";
import {
  orderStatusFormSchema,
  type OrderStatusFormValues,
} from "@/features/dashboard/types";

/**
 * The one place an admin moves an order along.
 *
 * The select only offers the moves the shared flow allows, so `paid` and
 * `refunded` never appear here — payment truth comes from the verified Paymob
 * callback, and a refund has to actually send the money back. The note and the
 * courier fields are what the customer reads on their timeline, so they are
 * written in the same submission as the status itself.
 */
export function OrderStatusForm({
  orderId,
  status,
  courier,
  trackingNumber,
  trackingUrl,
}: {
  orderId: string;
  status: OrderStatus;
  courier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
}) {
  const router = useRouter();
  const { guard } = useDemoGuard();
  const [pending, startTransition] = useTransition();
  const autoFilled = useRef(trackingUrl ?? "");

  const form = useForm<OrderStatusFormValues>({
    resolver: zodResolver(orderStatusFormSchema),
    defaultValues: {
      status,
      note: "",
      courier: courier ?? "",
      trackingNumber: trackingNumber ?? "",
      trackingUrl: trackingUrl ?? "",
    },
  });

  const chosen = useWatch({ control: form.control, name: "status" });
  const moves = ORDER_STATUS_FLOW[status];
  const showTracking = carriesTracking(chosen) || Boolean(trackingNumber);

  /**
   * Keeps the courier link in step with the courier and consignment number,
   * without ever overwriting a link typed by hand.
   */
  function refreshTrackingUrl(nextCourier: string, nextNumber: string) {
    const current = form.getValues("trackingUrl");
    if (current && current !== autoFilled.current) return;

    const generated = trackingUrlFor(nextCourier, nextNumber);
    autoFilled.current = generated;
    form.setValue("trackingUrl", generated);
  }

  function onSubmit(values: OrderStatusFormValues) {
    guard(() =>
      startTransition(async () => {
        const result = await updateOrderStatusAction(orderId, values);
        if (result.ok) {
          toast.success(
            values.status === status
              ? "Tracking updated"
              : `Order marked ${orderStatusMeta[values.status].label.toLowerCase()}`,
          );
          form.setValue("note", "");
          router.refresh();
        } else {
          toast.error(result.error);
        }
      }),
    );
  }

  if (moves.length === 0 && !showTracking) {
    return (
      <p className="text-sm text-grey-2">
        {orderStatusMeta[status].blurb} Nothing further to set from here.
      </p>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="up-xs text-grey-2">Status</FormLabel>
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={moves.length === 0}
              >
                <FormControl>
                  <SelectTrigger className="h-11 w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={status}>
                    Stay {orderStatusMeta[status].label.toLowerCase()}
                  </SelectItem>
                  {moves.map((move) => (
                    <SelectItem key={move} value={move}>
                      Mark {orderStatusMeta[move].label.toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription className="text-[11px] text-grey">
                {moves.length === 0
                  ? "This order has reached the end of the journey."
                  : "Payment and refunds are set by Paymob, not from here."}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {chosen !== status ? (
          <FormField
            control={form.control}
            name="note"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="up-xs text-grey-2">
                  Note{" "}
                  <span className="normal-case tracking-normal text-grey">
                    (optional)
                  </span>
                </FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    rows={2}
                    placeholder="Left the warehouse this morning."
                    className="resize-y text-sm"
                  />
                </FormControl>
                <FormDescription className="text-[11px] text-grey">
                  The customer reads this on their timeline.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : null}

        {showTracking ? (
          <div className="grid gap-4 border-t border-line pt-4">
            <FormField
              control={form.control}
              name="courier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="up-xs text-grey-2">Courier</FormLabel>
                  <Select
                    value={field.value || undefined}
                    onValueChange={(value) => {
                      field.onChange(value);
                      refreshTrackingUrl(value, form.getValues("trackingNumber"));
                    }}
                  >
                    <FormControl>
                      <SelectTrigger className="h-11 w-full">
                        <SelectValue placeholder="Pick a courier" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {COURIERS.map((entry) => (
                        <SelectItem key={entry.name} value={entry.name}>
                          {entry.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="trackingNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="up-xs text-grey-2">Consignment</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      className="h-11 font-mono tabular-nums"
                      placeholder="41728394"
                      onChange={(event) => {
                        field.onChange(event);
                        refreshTrackingUrl(
                          form.getValues("courier"),
                          event.target.value,
                        );
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="trackingUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="up-xs text-grey-2">Tracking link</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      className="h-11 text-xs"
                      placeholder="https://"
                    />
                  </FormControl>
                  <FormDescription className="text-[11px] text-grey">
                    Filled in from the courier. Paste your own to override it.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        ) : null}

        <Button
          type="submit"
          size="lg"
          disabled={pending}
          className="up-sm h-11 font-semibold"
        >
          {pending ? <Loader2 className="animate-spin" /> : null}
          {chosen === status ? "Save tracking" : "Update order"}
        </Button>
      </form>
    </Form>
  );
}
