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
              These values are what the storefront shows. Checkout recomputes every total
              from the database before charging.
            </p>
          </div>

          <Button
            type="submit"
            size="lg"
            disabled={pending || !form.formState.isDirty}
            className="up-sm mt-5 h-12 w-full font-semibold"
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
