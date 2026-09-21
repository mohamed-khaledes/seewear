"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { StatusPill } from "@/components/common/status-pill";
import { Button } from "@/components/ui/button";
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
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatMoney } from "@/lib/utils";
import { useDemoGuard } from "@/features/dashboard/hooks/use-demo-guard";
import {
  deleteDiscountAction,
  saveDiscountAction,
} from "@/features/dashboard/services/api/settings-actions";
import {
  discountFormSchema,
  type DiscountFormValues,
  type DiscountWithUsage,
} from "@/features/dashboard/types";

const BLANK: DiscountFormValues = {
  code: "",
  kind: "percent",
  percentOff: 10,
  amountOff: 0,
  minSubtotal: 0,
  active: true,
  usageLimit: 0,
  oncePerCustomer: false,
  expiresOn: "",
};

export function DiscountsManager({ codes }: { codes: DiscountWithUsage[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="grid gap-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="h-10 text-xs font-semibold">
              <Plus />
              New code
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New discount code</DialogTitle>
              <DialogDescription>
                Codes are validated on the server at checkout — the browser never decides
                what one is worth.
              </DialogDescription>
            </DialogHeader>
            <DiscountForm onDone={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-paper">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Value</TableHead>
              <TableHead className="hidden sm:table-cell">Minimum spend</TableHead>
              <TableHead>Used</TableHead>
              <TableHead className="hidden lg:table-cell">Expires</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Created</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {codes.map((code) => (
              <DiscountRow key={code.id} code={code} />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function DiscountRow({ code }: { code: DiscountWithUsage }) {
  const expired = Boolean(code.expires_at && new Date(code.expires_at) < new Date());
  const usedUp = code.usage_limit !== null && code.uses >= code.usage_limit;
  const router = useRouter();
  const { guard } = useDemoGuard();
  const [pending, startTransition] = useTransition();

  function remove() {
    guard(() =>
      startTransition(async () => {
        const result = await deleteDiscountAction(code.id);
        if (result.ok) {
          toast.success(`${code.code} deleted`);
          router.refresh();
        } else {
          toast.error(result.error);
        }
      }),
    );
  }

  return (
    <TableRow>
      <TableCell className="font-mono text-xs font-bold">{code.code}</TableCell>
      <TableCell className="tabular-nums">
        {code.percent_off
          ? `${code.percent_off}% off`
          : formatMoney(code.amount_off_cents ?? 0)}
      </TableCell>
      <TableCell className="hidden sm:table-cell tabular-nums">
        {code.min_subtotal_cents === 0 ? "—" : formatMoney(code.min_subtotal_cents)}
      </TableCell>
      <TableCell className="tabular-nums text-xs">
        {code.uses}
        {code.usage_limit !== null ? ` / ${code.usage_limit}` : ""}
        {code.once_per_customer ? (
          <span className="ml-1.5 text-grey">· once each</span>
        ) : null}
      </TableCell>
      <TableCell className="hidden lg:table-cell text-xs text-grey-2">
        {code.expires_at ? formatDate(code.expires_at) : "—"}
      </TableCell>
      <TableCell>
        <StatusPill tone={code.active && !expired && !usedUp ? "ok" : "mut"}>
          {!code.active ? "Paused" : expired ? "Expired" : usedUp ? "Used up" : "Active"}
        </StatusPill>
      </TableCell>
      <TableCell className="hidden md:table-cell text-xs text-grey-2">
        {formatDate(code.created_at)}
      </TableCell>
      <TableCell>
        <button
          type="button"
          onClick={remove}
          disabled={pending}
          aria-label={`Delete ${code.code}`}
          className="text-grey-2 transition-colors hover:text-sale"
        >
          {pending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Trash2 className="size-3.5" />
          )}
        </button>
      </TableCell>
    </TableRow>
  );
}

function DiscountForm({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const { guard } = useDemoGuard();
  const [pending, startTransition] = useTransition();

  const form = useForm<DiscountFormValues>({
    resolver: zodResolver(discountFormSchema),
    defaultValues: BLANK,
  });

  const kind = useWatch({ control: form.control, name: "kind" });

  function onSubmit(values: DiscountFormValues) {
    guard(() =>
      startTransition(async () => {
        const result = await saveDiscountAction(values);
        if (result.ok) {
          toast.success("Discount code saved");
          form.reset(BLANK);
          onDone();
          router.refresh();
        } else {
          toast.error(result.error);
        }
      }),
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="up-xs text-grey-2">Code</FormLabel>
              <FormControl>
                <Input
                  className="h-11 font-mono uppercase"
                  placeholder="BLACKFRIDAY"
                  {...field}
                  onChange={(event) => field.onChange(event.target.value.toUpperCase())}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="kind"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="up-xs text-grey-2">Type</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="h-11 w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="percent">Percentage off</SelectItem>
                    <SelectItem value="amount">Fixed amount off</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {kind === "percent" ? (
            <FormField
              control={form.control}
              name="percentOff"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="up-xs text-grey-2">Percent off</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      className="h-11 tabular-nums"
                      {...field}
                      onChange={(event) =>
                        field.onChange(event.target.valueAsNumber || 0)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : (
            <FormField
              control={form.control}
              name="amountOff"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="up-xs text-grey-2">Amount off (EGP)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      className="h-11 tabular-nums"
                      {...field}
                      onChange={(event) =>
                        field.onChange(event.target.valueAsNumber || 0)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        <FormField
          control={form.control}
          name="minSubtotal"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="up-xs text-grey-2">Minimum spend (EGP)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  className="h-11 tabular-nums"
                  {...field}
                  onChange={(event) => field.onChange(event.target.valueAsNumber || 0)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="usageLimit"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="up-xs text-grey-2">Total uses</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    className="h-11 tabular-nums"
                    placeholder="Unlimited"
                    {...field}
                    value={field.value || ""}
                    onChange={(event) => field.onChange(event.target.valueAsNumber || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="expiresOn"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="up-xs text-grey-2">Last day valid</FormLabel>
                <FormControl>
                  <Input type="date" className="h-11" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="oncePerCustomer"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between gap-3">
              <FormLabel className="up-xs text-grey-2">Once per customer</FormLabel>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="active"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between gap-3">
              <FormLabel className="up-xs text-grey-2">Active</FormLabel>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <Button
          type="submit"
          size="lg"
          disabled={pending}
          className="up-sm mt-2 h-12 font-semibold"
        >
          {pending ? <Loader2 className="animate-spin" /> : null}
          Save code
        </Button>
      </form>
    </Form>
  );
}
