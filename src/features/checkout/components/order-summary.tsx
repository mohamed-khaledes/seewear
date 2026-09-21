"use client";

import { useState, useTransition } from "react";
import { Check, X } from "lucide-react";

import { ProductShot } from "@/components/common/product-shot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/utils";
import { formatTaxRate, type PricingRules } from "@/lib/pricing";
import { computeTotals } from "@/features/cart/services/utils/totals";
import type { CartLine } from "@/features/cart/types";
import { previewDiscount } from "@/features/checkout/services/api/discount-actions";
import type { DiscountPreview } from "@/features/checkout/types";

export function OrderSummary({
  items,
  discount,
  rules,
  governorate,
  email,
  onDiscountChange,
}: {
  items: CartLine[];
  discount: DiscountPreview | null;
  rules: PricingRules;
  /** Empty until the address form has one; shipping is the flat estimate until then. */
  governorate: string;
  email: string;
  onDiscountChange: (discount: DiscountPreview | null) => void;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const totals = computeTotals(items, discount?.discountCents ?? 0, rules, governorate);

  function apply(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await previewDiscount(
        code,
        items.map((line) => ({ variantId: line.variantId, quantity: line.quantity })),
        email,
      );

      if (result.ok) {
        onDiscountChange(result.discount);
        setCode("");
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <aside className="bg-concrete px-5 py-10 lg:border-l lg:border-line lg:px-11">
      <h2 className="up-sm mb-5 text-grey-2">Order summary</h2>

      <ul className="grid gap-4">
        {items.map((line) => (
          <li key={line.variantId} className="flex items-center gap-3.5">
            <div className="relative w-14 shrink-0 overflow-hidden rounded-md border border-line bg-white">
              <ProductShot
                src={line.imageUrl}
                alt={line.name}
                sizes="56px"
                className="aspect-[1/1.07]"
                imageClassName="p-1.5"
              />
              <span className="absolute -right-2 -top-2 grid size-5 place-items-center rounded-full bg-grey-2 text-[10px] font-semibold text-white">
                {line.quantity}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold">{line.name}</p>
              <p className="up-xs mt-0.5 text-grey-2">
                {[line.color, line.size].filter(Boolean).join(" · ") || "One size"}
              </p>
            </div>
            <p className="text-xs font-semibold tabular-nums">
              {formatMoney(line.priceCents * line.quantity)}
            </p>
          </li>
        ))}
      </ul>

      {discount ? (
        <div className="mt-5 flex items-center justify-between rounded-md border border-ok/30 bg-ok-bg px-3 py-2.5">
          <span className="up-xs flex items-center gap-2 font-semibold text-ok">
            <Check className="size-3.5" />
            {discount.code}
          </span>
          <button
            type="button"
            onClick={() => onDiscountChange(null)}
            aria-label="Remove discount code"
            className="text-ok transition-opacity hover:opacity-70"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : (
        <form onSubmit={apply} className="mt-5 grid gap-1.5">
          <div className="flex gap-2">
            <Input
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              placeholder="Discount code"
              aria-label="Discount code"
              className="h-11"
            />
            <Button
              type="submit"
              variant="outline"
              size="lg"
              disabled={pending}
              className="up-xs h-11 shrink-0 px-4 font-semibold"
            >
              Apply
            </Button>
          </div>
          {error ? <p className="text-xs text-sale">{error}</p> : null}
        </form>
      )}

      <dl className="mt-6 grid gap-2.5 border-t border-line pt-5 text-sm">
        <Row label="Subtotal" value={formatMoney(totals.subtotalCents)} />
        {totals.discountCents > 0 ? (
          <Row label="Discount" value={`-${formatMoney(totals.discountCents)}`} accent />
        ) : null}
        <Row
          label={governorate ? `Shipping to ${governorate}` : "Shipping (estimate)"}
          value={totals.shippingCents === 0 ? "Free" : formatMoney(totals.shippingCents)}
        />
        <Row label={`VAT (${formatTaxRate(rules)})`} value={formatMoney(totals.taxCents)} />
        <div className="mt-2 flex items-baseline justify-between border-t border-line pt-4">
          <dt className="text-base font-bold">Total</dt>
          <dd className="text-lg font-bold tabular-nums">
            {formatMoney(totals.totalCents)}
          </dd>
        </div>
      </dl>
    </aside>
  );
}

function Row({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex justify-between text-grey-2">
      <dt>{label}</dt>
      <dd className={`tabular-nums ${accent ? "text-ok" : "text-ink"}`}>{value}</dd>
    </div>
  );
}
