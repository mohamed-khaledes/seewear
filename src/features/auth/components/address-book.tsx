"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, MapPin, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { EGYPT_GOVERNORATES } from "@/features/checkout/types";
import {
  deleteAddressAction,
  makeDefaultAddressAction,
  saveAddressAction,
  type AddressResult,
} from "@/features/auth/services/api/address-actions";
import { addressSchema, type AddressValues, type SavedAddress } from "@/features/auth/types";

/**
 * The saved addresses checkout offers as one-tap fills. Checkout can add to
 * this on its own ("save this address"), so most people never open this —
 * it is here for correcting one and choosing the default.
 */
export function AddressBook({ addresses }: { addresses: SavedAddress[] }) {
  const [adding, setAdding] = useState(false);

  return (
    <section className="border border-line bg-paper p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="up-sm text-grey-2">Addresses</h2>
        <Dialog open={adding} onOpenChange={setAdding}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="up-xs font-semibold">
              <Plus className="size-3.5" />
              Add address
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90dvh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New address</DialogTitle>
              <DialogDescription>Offered as a one-tap fill at checkout.</DialogDescription>
            </DialogHeader>
            <AddressForm
              makeDefault={addresses.length === 0}
              onDone={() => setAdding(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {addresses.length === 0 ? (
        <p className="text-sm text-grey-2">
          No saved addresses yet. Tick “save this address” at checkout and it lands here.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {addresses.map((address) => (
            <AddressCard key={address.id} address={address} />
          ))}
        </ul>
      )}
    </section>
  );
}

function AddressCard({ address }: { address: SavedAddress }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<AddressResult>, success: string) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        toast.success(success);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <li className="flex flex-col gap-3 border border-line p-4">
      <div className="flex items-start gap-2.5">
        <MapPin className="mt-0.5 size-4 shrink-0 text-grey-2" strokeWidth={1.6} />
        <div className="min-w-0 text-sm leading-relaxed">
          <p className="font-semibold">
            {address.label || address.full_name}
            {address.is_default ? (
              <span className="up-xs ml-2 font-medium text-ok">Default</span>
            ) : null}
          </p>
          <p className="text-grey-2">
            {address.line1}
            {address.line2 ? `, ${address.line2}` : ""}
          </p>
          <p className="text-grey-2">
            {address.city}, {address.governorate}
          </p>
          <p className="text-grey-2 tabular-nums">{address.phone}</p>
        </div>
      </div>
      <div className="mt-auto flex items-center gap-4">
        {!address.is_default ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => makeDefaultAddressAction(address.id), "Default updated")}
            className="up-xs text-grey-2 underline-offset-4 hover:text-ink hover:underline"
          >
            Make default
          </button>
        ) : null}
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => deleteAddressAction(address.id), "Address removed")}
          aria-label={`Remove ${address.label || address.line1}`}
          className="ml-auto text-grey-2 transition-colors hover:text-sale"
        >
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
        </button>
      </div>
    </li>
  );
}

function AddressForm({ makeDefault, onDone }: { makeDefault: boolean; onDone: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const form = useForm<AddressValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      label: "",
      fullName: "",
      phone: "",
      line1: "",
      line2: "",
      city: "",
      governorate: "",
      postalCode: "",
      isDefault: makeDefault,
    },
  });

  function onSubmit(values: AddressValues) {
    startTransition(async () => {
      const result = await saveAddressAction(values);
      if (result.ok) {
        toast.success("Address saved");
        onDone();
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  const text = (
    name: "label" | "fullName" | "phone" | "line1" | "line2" | "city" | "postalCode",
    label: string,
    autoComplete?: string,
  ) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="up-xs text-grey-2">{label}</FormLabel>
          <FormControl>
            <Input className="h-11" autoComplete={autoComplete} {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-3.5">
        {text("label", "Label (optional) — Home, Work", "off")}
        <div className="grid gap-3.5 sm:grid-cols-2">
          {text("fullName", "Full name", "name")}
          {text("phone", "Phone", "tel")}
        </div>
        {text("line1", "Street and building", "address-line1")}
        {text("line2", "Apartment, floor (optional)", "address-line2")}
        <div className="grid gap-3.5 sm:grid-cols-2">
          {text("city", "City", "address-level2")}
          <FormField
            control={form.control}
            name="governorate"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="up-xs text-grey-2">Governorate</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
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
        {text("postalCode", "Postal code (optional)", "postal-code")}
        <FormField
          control={form.control}
          name="isDefault"
          render={({ field }) => (
            <FormItem className="flex items-center gap-2.5">
              <FormControl>
                <Checkbox
                  id="address-default"
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(checked === true)}
                />
              </FormControl>
              <FormLabel htmlFor="address-default" className="text-xs font-normal text-grey-2">
                Use this at checkout by default
              </FormLabel>
            </FormItem>
          )}
        />
        <Button type="submit" size="lg" disabled={pending} className="up-sm mt-1 h-12 font-semibold">
          {pending ? <Loader2 className="animate-spin" /> : null}
          Save address
        </Button>
      </form>
    </Form>
  );
}
