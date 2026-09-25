"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { CartLineRow } from "@/features/cart/components/cart-line-row";
import { Viewer3DToggle } from "@/features/products/components/viewer-3d-toggle";
import { useCart } from "@/features/cart/hooks/use-cart";
import { amountToFreeShipping } from "@/features/cart/services/utils/totals";
import { formatTaxRate } from "@/lib/pricing";

export function CartPage() {
  const t = useT();
  const { items, totals, rules, hydrated, setQuantity, removeItem } = useCart();
  const remaining = amountToFreeShipping(totals.subtotalCents, rules);

  return (
    <div className="bg-concrete">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line bg-paper px-5 pb-6 pt-9 lg:px-6">
        <div>
          <p className="up-xs text-grey-2">{t("cart.step")}</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight lg:text-3xl">
            {t("cart.title")}
          </h1>
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
          <h2 className="mt-4 text-base font-semibold">{t("cart.emptyTitle")}</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-grey-2">{t("cart.emptyBody")}</p>
          <Button asChild size="lg" className="up-sm mt-6 h-12 px-8 font-semibold">
            <Link href="/products">{t("common.startShopping")}</Link>
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

          <aside className="border-s border-line bg-concrete px-5 py-8 lg:px-8">
            <h2 className="up-sm mb-5 text-grey-2">{t("cart.orderSummary")}</h2>

            <dl className="grid gap-2.5 text-sm">
              <div className="flex justify-between text-grey-2">
                <dt>{t("cart.subtotal")}</dt>
                <dd className="tabular-nums text-ink">
                  {formatMoney(totals.subtotalCents)}
                </dd>
              </div>
              <div className="flex justify-between text-grey-2">
                <dt>{t("cart.shipping")}</dt>
                <dd className="tabular-nums text-ink">
                  {totals.shippingCents === 0
                    ? t("common.free")
                    : formatMoney(totals.shippingCents)}
                </dd>
              </div>
              <div className="flex justify-between text-grey-2">
                <dt>{t("cart.vat", { rate: formatTaxRate(rules) })}</dt>
                <dd className="tabular-nums text-ink">{formatMoney(totals.taxCents)}</dd>
              </div>
              <div className="mt-3 flex items-baseline justify-between border-t border-line pt-4">
                <dt className="text-base font-bold">{t("cart.total")}</dt>
                <dd className="text-lg font-bold tabular-nums">
                  {formatMoney(totals.totalCents)}
                </dd>
              </div>
            </dl>

            {remaining > 0 ? (
              <p className="up-xs mt-4 text-grey-2">
                {t("cart.freeShippingRemaining", { amount: formatMoney(remaining) })}
              </p>
            ) : (
              <p className="up-xs mt-4 text-ok">{t("cart.freeShippingUnlocked")}</p>
            )}

            <Button asChild size="lg" className="up-sm mt-6 h-12 w-full font-semibold">
              <Link href="/checkout">{t("cart.checkout")}</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="up-sm mt-2 h-11 w-full font-semibold"
            >
              <Link href="/products">{t("common.keepShopping")}</Link>
            </Button>

            <p className="mt-4 text-xs leading-relaxed text-grey">
              {t("cart.recalculatedNote")} {t("cart.shippingConfirmed")}{" "}
              <Link href="/help/returns" className="underline underline-offset-2 hover:text-ink">
                {t("checkout.agreeReturns")}
              </Link>
              .
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}
