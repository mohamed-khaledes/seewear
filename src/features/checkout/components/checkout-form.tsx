"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Banknote, CreditCard, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, formatMoney } from "@/lib/utils";
import type { PricingRules } from "@/lib/pricing";
import { computeTotals } from "@/features/cart/services/utils/totals";
import type { CartLine } from "@/features/cart/types";
import type { SavedAddress } from "@/features/auth";
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
  rules: PricingRules;
  signedIn: boolean;
  savedAddresses: SavedAddress[];
  defaultEmail?: string;
  defaultName?: string;
  onOrderPlaced: () => void;
  /** The summary beside the form re-prices shipping as these change. */
  onGovernorateChange: (governorate: string) => void;
  onEmailChange: (email: string) => void;
};

export function CheckoutForm({
  items,
  discount,
  rules,
  signedIn,
  savedAddresses,
  defaultEmail,
  defaultName,
  onOrderPlaced,
  onGovernorateChange,
  onEmailChange,
}: CheckoutFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const fallback = savedAddresses.find((address) => address.is_default) ?? savedAddresses[0];

  const form = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      email: defaultEmail ?? "",
      discountCode: discount?.code ?? "",
      paymentMethod: "card",
      saveAddress: signedIn && savedAddresses.length === 0,
      shipping: fallback
        ? {
            fullName: fallback.full_name,
            phone: fallback.phone,
            line1: fallback.line1,
            line2: fallback.line2 ?? "",
            city: fallback.city,
            governorate: fallback.governorate,
            postalCode: fallback.postal_code ?? "",
            country: "Egypt",
          }
        : {
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

  const governorate = useWatch({ control: form.control, name: "shipping.governorate" });
  const paymentMethod = useWatch({ control: form.control, name: "paymentMethod" });
  const totals = computeTotals(items, discount?.discountCents ?? 0, rules, governorate);

  function applyAddress(address: SavedAddress) {
    form.setValue("shipping", {
      fullName: address.full_name,
      phone: address.phone,
      line1: address.line1,
      line2: address.line2 ?? "",
      city: address.city,
      governorate: address.governorate,
      postalCode: address.postal_code ?? "",
      country: "Egypt",
    });
    form.setValue("saveAddress", false);
    onGovernorateChange(address.governorate);
  }

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

      // The bag is now an order; clear it before leaving the page.
      onOrderPlaced();
      window.location.assign(result.redirectUrl);
    } catch {
      toast.error("We could not place that order. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const cod = paymentMethod === "cod";

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
                    onBlur={() => {
                      field.onBlur();
                      onEmailChange(field.value);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </section>

        <section>
          <h2 className="mb-3.5 text-[13px] font-bold tracking-tight">Shipping address</h2>

          {savedAddresses.length > 0 ? (
            <div className="mb-4 flex flex-wrap gap-2">
              {savedAddresses.map((address) => (
                <button
                  key={address.id}
                  type="button"
                  onClick={() => applyAddress(address)}
                  className="rounded-md border border-line bg-white px-3 py-2 text-left text-xs transition-colors hover:border-ink"
                >
                  <span className="block font-semibold">
                    {address.label || address.city}
                    {address.is_default ? (
                      <span className="ml-1.5 font-normal text-grey">· default</span>
                    ) : null}
                  </span>
                  <span className="block text-grey-2">
                    {address.line1}, {address.governorate}
                  </span>
                </button>
              ))}
            </div>
          ) : null}

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
                      <Input autoComplete="address-level2" className="h-11" {...field} />
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
                    <FormLabel className="text-[11px] text-grey-2">Governorate</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        onGovernorateChange(value);
                      }}
                    >
                      <FormControl>
                        <SelectTrigger className="h-11 w-full">
                          <SelectValue placeholder="Choose one" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {EGYPT_GOVERNORATES.map((name) => (
                          <SelectItem key={name} value={name}>
                            {name}
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
                      <Input autoComplete="postal-code" className="h-11" {...field} />
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
                      <Input readOnly className="h-11 bg-concrete text-grey-2" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {signedIn ? (
              <FormField
                control={form.control}
                name="saveAddress"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2.5">
                    <FormControl>
                      <Checkbox
                        id="save-address"
                        checked={field.value}
                        onCheckedChange={(checked) => field.onChange(checked === true)}
                      />
                    </FormControl>
                    <FormLabel htmlFor="save-address" className="text-xs font-normal text-grey-2">
                      Save this address for next time
                    </FormLabel>
                  </FormItem>
                )}
              />
            ) : null}
          </div>
        </section>

        <section>
          <h2 className="mb-3.5 text-[13px] font-bold tracking-tight">Payment</h2>

          <FormField
            control={form.control}
            name="paymentMethod"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <RadioGroup
                    value={field.value}
                    onValueChange={(value) =>
                      field.onChange(value as CheckoutValues["paymentMethod"])
                    }
                    className="gap-2.5"
                  >
                    <PaymentOption
                      id="pay-card"
                      value="card"
                      selected={field.value === "card"}
                      icon={<CreditCard className="size-4" />}
                      title="Card or mobile wallet"
                      body="Finish on Paymob's secure checkout in EGP. Your card details never touch SEEWEAR."
                    />
                    {rules.codEnabled ? (
                      <PaymentOption
                        id="pay-cod"
                        value="cod"
                        selected={field.value === "cod"}
                        icon={<Banknote className="size-4" />}
                        title="Cash on delivery"
                        body="Pay the courier in cash when it arrives. We confirm the order straight away."
                      />
                    ) : null}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            size="lg"
            disabled={submitting || items.length === 0}
            className="up-sm mt-5 h-14 w-full font-semibold"
          >
            {submitting ? (
              <>
                <Loader2 className="animate-spin" />
                {cod ? "Placing your order" : "Opening secure checkout"}
              </>
            ) : cod ? (
              <>Place order · pay {formatMoney(totals.totalCents)} on delivery</>
            ) : (
              <>
                <Lock className="size-3.5" />
                Pay {formatMoney(totals.totalCents)}
              </>
            )}
          </Button>

          <p className="mt-3.5 text-center text-[11px] leading-relaxed text-grey">
            By placing this order you agree to our{" "}
            <Link href="/legal/terms" className="underline underline-offset-2 hover:text-ink">
              terms of sale
            </Link>{" "}
            and{" "}
            <Link href="/help/returns" className="underline underline-offset-2 hover:text-ink">
              returns policy
            </Link>
            . We use your details as our{" "}
            <Link href="/legal/privacy" className="underline underline-offset-2 hover:text-ink">
              privacy policy
            </Link>{" "}
            describes.
          </p>
        </section>
      </form>
    </Form>
  );
}

function PaymentOption({
  id,
  value,
  selected,
  icon,
  title,
  body,
}: {
  id: string;
  value: string;
  selected: boolean;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-lg border bg-white p-4 transition-colors",
        selected ? "border-ink" : "border-line hover:border-grey",
      )}
    >
      <RadioGroupItem id={id} value={value} className="mt-0.5" />
      <span className="grid gap-1">
        <span className="flex items-center gap-2 text-sm font-semibold">
          {icon}
          {title}
        </span>
        <span className="text-xs leading-relaxed text-grey-2">{body}</span>
      </span>
    </label>
  );
}
