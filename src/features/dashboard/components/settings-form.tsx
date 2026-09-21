"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
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
import { Switch } from "@/components/ui/switch";
import { useDemoGuard } from "@/features/dashboard/hooks/use-demo-guard";
import { updateStoreSettingsAction } from "@/features/dashboard/services/api/settings-actions";
import {
  storeSettingsFormSchema,
  type StoreSettingsFormValues,
} from "@/features/dashboard/types";

export function SettingsForm({
  defaultValues,
}: {
  defaultValues: StoreSettingsFormValues;
}) {
  const router = useRouter();
  const { guard } = useDemoGuard();
  const [pending, startTransition] = useTransition();

  const form = useForm<StoreSettingsFormValues>({
    resolver: zodResolver(storeSettingsFormSchema),
    defaultValues,
  });

  function onSubmit(values: StoreSettingsFormValues) {
    guard(() =>
      startTransition(async () => {
        const result = await updateStoreSettingsAction(values);
        if (result.ok) {
          toast.success("Settings saved");
          form.reset(values);
          router.refresh();
        } else {
          toast.error(result.error);
        }
      }),
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-line bg-paper p-5">
          <h2 className="up-sm mb-4 text-grey-2">Store</h2>
          <div className="grid gap-4">
            <Field name="storeName" label="Store name" control={form.control} />
            <Field name="supportEmail" label="Support email" control={form.control} />
            <Field name="supportPhone" label="Support phone" control={form.control} />
            <FormField
              control={form.control}
              name="announcement"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="up-xs text-grey-2">Announcement bar</FormLabel>
                  <FormControl>
                    <Input className="h-11" {...field} />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Shows across the top of every storefront page. Leave it empty to hide
                    the bar.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </section>

        <section className="rounded-xl border border-line bg-paper p-5">
          <h2 className="up-sm mb-4 text-grey-2">Shipping &amp; tax</h2>
          <div className="grid gap-4">
            <NumberField
              name="shippingFlat"
              label="Flat express shipping (EGP)"
              control={form.control}
            />
            <NumberField
              name="freeShippingThreshold"
              label="Free shipping over (EGP)"
              control={form.control}
            />
            <NumberField
              name="taxRatePercent"
              label="VAT rate (%)"
              step="0.1"
              control={form.control}
            />
            <p className="text-xs leading-relaxed text-grey">
              Checkout charges exactly these, read fresh for every order. Governorates
              with their own rate are set below.
            </p>

            <FormField
              control={form.control}
              name="codEnabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between gap-4 border-t border-line pt-4">
                  <div>
                    <FormLabel className="up-xs text-grey-2">Cash on delivery</FormLabel>
                    <FormDescription className="mt-1 text-xs">
                      Offered at checkout beside card. Orders are confirmed at once and
                      paid to the courier.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

        </section>

        <section className="rounded-xl border border-line bg-paper p-5 lg:col-span-2">
          <h2 className="up-sm mb-1 text-grey-2">Legal identity</h2>
          <p className="mb-4 text-xs leading-relaxed text-grey">
            Printed in the storefront footer and on every tax invoice. Paymob asks for the
            same details at merchant onboarding. Leave a field empty and it is left off.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <LegalField name="legalName" label="Registered company name" control={form.control} />
            <LegalField
              name="commercialRegister"
              label="Commercial registration no."
              control={form.control}
            />
            <LegalField
              name="taxRegistration"
              label="Tax registration no."
              control={form.control}
            />
            <LegalField
              name="registeredAddress"
              label="Registered address"
              control={form.control}
            />
          </div>

          <Button
            type="submit"
            size="lg"
            disabled={pending || !form.formState.isDirty}
            className="up-sm mt-5 h-12 w-full font-semibold lg:w-auto lg:px-10"
          >
            {pending ? (
              <>
                <Loader2 className="animate-spin" />
                Saving
              </>
            ) : (
              "Save settings"
            )}
          </Button>
        </section>
      </form>
    </Form>
  );
}

type Control = ReturnType<typeof useForm<StoreSettingsFormValues>>["control"];

function Field({
  name,
  label,
  control,
}: {
  name: "storeName" | "supportEmail" | "supportPhone" | "announcement";
  label: string;
  control: Control;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="up-xs text-grey-2">{label}</FormLabel>
          <FormControl>
            <Input className="h-11" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function LegalField({
  name,
  label,
  control,
}: {
  name: "legalName" | "commercialRegister" | "taxRegistration" | "registeredAddress";
  label: string;
  control: Control;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="up-xs text-grey-2">{label}</FormLabel>
          <FormControl>
            <Input className="h-11" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function NumberField({
  name,
  label,
  control,
  step = "1",
}: {
  name: "shippingFlat" | "freeShippingThreshold" | "taxRatePercent";
  label: string;
  control: Control;
  step?: string;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="up-xs text-grey-2">{label}</FormLabel>
          <FormControl>
            <Input
              type="number"
              min={0}
              step={step}
              className="h-11 tabular-nums"
              {...field}
              onChange={(event) => field.onChange(event.target.valueAsNumber || 0)}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
