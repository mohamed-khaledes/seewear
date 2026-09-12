"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Lock } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
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
import { formatMoney } from "@/lib/utils";
import { computeTotals } from "@/features/cart/services/utils/totals";
import type { CartLine } from "@/features/cart/types";
import {
  checkoutSchema,
  EGYPT_GOVERNORATES,
  type CheckoutResponse,
  type CheckoutValues,
  type DiscountPreview,
} from "@/features/checkout/types";

type CheckoutFormProps = {
  items: CartLine[];
  discount: DiscountPreview | null;
  defaultEmail?: string;
  defaultName?: string;
  onOrderPlaced: () => void;
};

export function CheckoutForm({
  items,
  discount,
  defaultEmail,
  defaultName,
  onOrderPlaced,
}: CheckoutFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const totals = computeTotals(items, discount?.discountCents ?? 0);

  const form = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      email: defaultEmail ?? "",
      discountCode: discount?.code ?? "",
      shipping: {
        fullName: defaultName ?? "",
        phone: "",
        line1: "",
        line2: "",
        city: "",
        governorate: "",
        postalCode: "",
        country: "Egypt",
      },
    },
  });

  async function onSubmit(values: CheckoutValues) {
    setSubmitting(true);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          discountCode: discount?.code ?? "",
          items: items.map((line) => ({
            variantId: line.variantId,
            quantity: line.quantity,
          })),
        }),
      });

      const result = (await response.json()) as CheckoutResponse;

      if (!result.ok) {
        toast.error(result.error);
        if (result.unavailable?.length) router.refresh();
        return;
      }

      // The bag is now an order; clear it before leaving for Paymob.
      onOrderPlaced();
      window.location.assign(result.redirectUrl);
    } catch {
      toast.error("We could not reach the payment provider. Try again in a moment.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-8">
        <section>
          <h2 className="mb-3.5 flex items-center justify-between text-[13px] font-bold tracking-tight">
            Contact
            <span className="up-xs font-medium text-grey-2">Step 2 of 3</span>
          </h2>

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[11px] text-grey-2">Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    autoComplete="email"
                    placeholder="you@email.com"
                    className="h-11"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </section>

        <section>
          <h2 className="mb-3.5 text-[13px] font-bold tracking-tight">
            Shipping address
          </h2>

          <div className="grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="shipping.fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[11px] text-grey-2">Full name</FormLabel>
                    <FormControl>
                      <Input autoComplete="name" className="h-11" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="shipping.phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[11px] text-grey-2">Phone</FormLabel>
                    <FormControl>
                      <Input
                        autoComplete="tel"
                        placeholder="+20 100 000 0000"
                        className="h-11"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="shipping.line1"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[11px] text-grey-2">Address</FormLabel>
                  <FormControl>
                    <Input
                      autoComplete="address-line1"
                      placeholder="Street, building"
                      className="h-11"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="shipping.line2"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[11px] text-grey-2">
                    Apartment, floor (optional)
                  </FormLabel>
                  <FormControl>
                    <Input autoComplete="address-line2" className="h-11" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="shipping.city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[11px] text-grey-2">City</FormLabel>
                    <FormControl>
                      <Input
                        autoComplete="address-level2"
                        className="h-11"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="shipping.governorate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[11px] text-grey-2">
                      Governorate
                    </FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="h-11 w-full">
                          <SelectValue placeholder="Choose one" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {EGYPT_GOVERNORATES.map((governorate) => (
                          <SelectItem key={governorate} value={governorate}>
                            {governorate}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="shipping.postalCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[11px] text-grey-2">
                      Postal code (optional)
                    </FormLabel>
                    <FormControl>
                      <Input
                        autoComplete="postal-code"
                        className="h-11"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="shipping.country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[11px] text-grey-2">Country</FormLabel>
                    <FormControl>
                      <Input
                        readOnly
                        className="h-11 bg-concrete text-grey-2"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-3.5 flex items-center justify-between text-[13px] font-bold tracking-tight">
            Payment
            <span className="up-xs font-medium text-grey-2">Secured by Paymob</span>
          </h2>

          <div className="rounded-lg border border-line bg-[#fdfdfd] p-4">
            <p className="text-sm leading-relaxed text-grey-2">
              You will finish on Paymob&apos;s secure checkout — card or mobile wallet,
              in EGP. Your card details never touch SEEWEAR.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {["Visa", "Mastercard", "Meeza", "Wallet"].map((method) => (
                <span
                  key={method}
                  className="rounded-md border border-line bg-white px-3 py-1.5 text-[10px] font-bold tracking-wide text-[#444]"
                >
                  {method.toUpperCase()}
                </span>
              ))}
            </div>
          </div>

          <Button
            type="submit"
            size="lg"
            disabled={submitting || items.length === 0}
            className="up-sm mt-4 h-14 w-full font-semibold"
          >
            {submitting ? (
              <>
                <Loader2 className="animate-spin" />
                Opening secure checkout
              </>
            ) : (
              <>
                <Lock className="size-3.5" />
                Pay {formatMoney(totals.totalCents)}
              </>
            )}
          </Button>

          <p className="mt-3.5 flex items-center justify-center gap-1.5 text-[10px] text-grey">
            <Lock className="size-3" />
            Payments are encrypted and processed by Paymob
          </p>
        </section>
      </form>
    </Form>
  );
}
