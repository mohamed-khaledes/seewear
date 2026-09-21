"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney } from "@/lib/utils";
import { CartLineRow } from "@/features/cart/components/cart-line-row";
import { Viewer3DToggle } from "@/features/products/components/viewer-3d-toggle";
import { useCart } from "@/features/cart/hooks/use-cart";
import { amountToFreeShipping } from "@/features/cart/services/utils/totals";
import { formatTaxRate } from "@/lib/pricing";

export function CartPage() {
  const { items, totals, rules, hydrated, setQuantity, removeItem } = useCart();
  const remaining = amountToFreeShipping(totals.subtotalCents, rules);

  return (
    <div className="bg-concrete">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line bg-paper px-5 pb-6 pt-9 lg:px-6">
        <div>
          <p className="up-xs text-grey-2">Step 1 of 3</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight lg:text-3xl">Your bag</h1>
        </div>
        <Viewer3DToggle className="hidden lg:inline-flex" />
      </div>

      {!hydrated ? (
        <div className="mx-auto grid max-w-6xl gap-4 px-5 py-10 lg:px-6">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : items.length === 0 ? (
        <div className="bg-paper px-6 py-24 text-center">
          <ShoppingBag className="mx-auto size-8 text-grey" strokeWidth={1.3} />
          <h2 className="mt-4 text-base font-semibold">Nothing in the bag yet</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-grey-2">
            Pieces you add will sit here until you check out.
          </p>
          <Button asChild size="lg" className="up-sm mt-6 h-12 px-8 font-semibold">
            <Link href="/products">Start shopping</Link>
          </Button>
        </div>
      ) : (
        <div className="mx-auto grid max-w-6xl gap-px px-0 py-0 lg:grid-cols-[1fr_380px]">
          <div className="divide-y divide-line bg-paper px-5 lg:px-8">
            {items.map((line) => (
              <CartLineRow
                key={line.variantId}
                line={line}
                onQuantityChange={setQuantity}
                onRemove={removeItem}
              />
            ))}
          </div>

          <aside className="border-l border-line bg-concrete px-5 py-8 lg:px-8">
            <h2 className="up-sm mb-5 text-grey-2">Order summary</h2>

            <dl className="grid gap-2.5 text-sm">
              <div className="flex justify-between text-grey-2">
                <dt>Subtotal</dt>
                <dd className="tabular-nums text-ink">
                  {formatMoney(totals.subtotalCents)}
                </dd>
              </div>
              <div className="flex justify-between text-grey-2">
                <dt>Shipping</dt>
                <dd className="tabular-nums text-ink">
                  {totals.shippingCents === 0
                    ? "Free"
                    : formatMoney(totals.shippingCents)}
                </dd>
              </div>
              <div className="flex justify-between text-grey-2">
                <dt>VAT ({formatTaxRate(rules)})</dt>
                <dd className="tabular-nums text-ink">{formatMoney(totals.taxCents)}</dd>
              </div>
              <div className="mt-3 flex items-baseline justify-between border-t border-line pt-4">
                <dt className="text-base font-bold">Total</dt>
                <dd className="text-lg font-bold tabular-nums">
                  {formatMoney(totals.totalCents)}
                </dd>
              </div>
            </dl>

            {remaining > 0 ? (
              <p className="up-xs mt-4 text-grey-2">
                {formatMoney(remaining)} more for free express shipping
              </p>
            ) : (
              <p className="up-xs mt-4 text-ok">Free express shipping unlocked</p>
            )}

            <Button asChild size="lg" className="up-sm mt-6 h-12 w-full font-semibold">
              <Link href="/checkout">Checkout</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="up-sm mt-2 h-11 w-full font-semibold"
            >
              <Link href="/products">Keep shopping</Link>
            </Button>

            <p className="mt-4 text-xs leading-relaxed text-grey">
              Totals are recalculated from the catalogue when you pay — the price you
              see is the price you are charged. Shipping is confirmed for your
              governorate at checkout. Fourteen days to return:{" "}
              <Link href="/help/returns" className="underline underline-offset-2 hover:text-ink">
                returns policy
              </Link>
              .
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}
