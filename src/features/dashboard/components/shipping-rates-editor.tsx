"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/utils";
import { EGYPT_GOVERNORATES } from "@/features/checkout";
import { useDemoGuard } from "@/features/dashboard/hooks/use-demo-guard";
import { saveShippingRatesAction } from "@/features/dashboard/services/api/settings-actions";

type Draft = { rate: string; days: string };

/**
 * One row per governorate. Blank means "the flat rate", which keeps the common
 * case — Cairo and Giza at the flat rate, the far south a little more — to a
 * handful of typed numbers rather than twenty-seven.
 */
export function ShippingRatesEditor({
  rates,
  flatCents,
}: {
  rates: { governorate: string; rate_cents: number; delivery_days: string | null }[];
  flatCents: number;
}) {
  const router = useRouter();
  const { guard } = useDemoGuard();
  const [pending, startTransition] = useTransition();

  const initial = Object.fromEntries(
    EGYPT_GOVERNORATES.map((governorate) => {
      const row = rates.find((rate) => rate.governorate === governorate);
      return [
        governorate,
        {
          rate: row ? String(row.rate_cents / 100) : "",
          days: row?.delivery_days ?? "",
        },
      ];
    }),
  ) as Record<string, Draft>;

  const [drafts, setDrafts] = useState(initial);
  const dirty = JSON.stringify(drafts) !== JSON.stringify(initial);

  function update(governorate: string, patch: Partial<Draft>) {
    setDrafts((current) => ({ ...current, [governorate]: { ...current[governorate], ...patch } }));
  }

  function save() {
    guard(() =>
      startTransition(async () => {
        const result = await saveShippingRatesAction({
          rows: EGYPT_GOVERNORATES.map((governorate) => {
            const draft = drafts[governorate];
            const value = draft.rate.trim();
            return {
              governorate,
              rate: value === "" ? null : Number(value),
              deliveryDays: draft.days,
            };
          }),
        });
        if (result.ok) {
          toast.success("Shipping rates saved");
          router.refresh();
        } else {
          toast.error(result.error);
        }
      }),
    );
  }

  return (
    <section className="rounded-xl border border-line bg-paper">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <h2 className="text-sm font-bold">Shipping by governorate</h2>
          <p className="mt-0.5 text-[11px] text-grey-2">
            Leave a rate blank to charge the flat {formatMoney(flatCents)}. Free shipping
            over the threshold applies everywhere.
          </p>
        </div>
        <Button
          type="button"
          size="lg"
          onClick={save}
          disabled={pending || !dirty}
          className="h-10 text-xs font-semibold"
        >
          {pending ? <Loader2 className="animate-spin" /> : null}
          Save rates
        </Button>
      </header>

      <div className="grid gap-x-8 gap-y-0 px-5 py-2 md:grid-cols-2">
        {EGYPT_GOVERNORATES.map((governorate) => {
          const draft = drafts[governorate];
          return (
            <div
              key={governorate}
              className="grid grid-cols-[1fr_96px_110px] items-center gap-2 border-b border-line py-2 last:border-b-0"
            >
              <label
                htmlFor={`rate-${governorate}`}
                className="truncate text-[12.5px] font-medium"
              >
                {governorate}
              </label>
              <Input
                id={`rate-${governorate}`}
                type="number"
                min={0}
                step="1"
                inputMode="decimal"
                placeholder={String(flatCents / 100)}
                value={draft.rate}
                onChange={(event) => update(governorate, { rate: event.target.value })}
                aria-label={`${governorate} rate in EGP`}
                className="h-9 text-end tabular-nums"
              />
              <Input
                type="text"
                placeholder="2–4 days"
                value={draft.days}
                maxLength={30}
                onChange={(event) => update(governorate, { days: event.target.value })}
                aria-label={`${governorate} delivery time`}
                className="h-9 text-xs"
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
