"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatMoney } from "@/lib/utils";
import { useDir, useT } from "@/lib/i18n";
import { amountToFreeShipping } from "@/features/cart/services/utils/totals";
import { CartLineRow } from "@/features/cart/components/cart-line-row";
import { useCart } from "@/features/cart/hooks/use-cart";
import { useUiStore } from "@/stores/ui-store";

export function CartDrawer() {
  const open = useUiStore((state) => state.cartDrawerOpen);
  const setOpen = useUiStore((state) => state.setCartDrawerOpen);
  const { items, totals, rules, setQuantity, removeItem, hydrated } = useCart();
  const t = useT();
  // The bag slides in from the side the language ends on.
  const dir = useDir();

  const remaining = amountToFreeShipping(totals.subtotalCents, rules);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side={dir === "rtl" ? "left" : "right"} className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-line px-6 py-5">
          <SheetTitle className="up-sm font-bold">
            {t("cart.title")}
            {hydrated && totals.itemCount > 0 ? ` (${totals.itemCount})` : ""}
          </SheetTitle>
        </SheetHeader>

        {!hydrated ? null : items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
            <ShoppingBag className="size-8 text-grey" strokeWidth={1.3} />
            <p className="text-base font-semibold">{t("cart.emptyTitle")}</p>
            <p className="text-sm text-grey-2">{t("cart.emptyBody")}</p>
            <Button asChild size="lg" className="up-sm mt-2 h-11 px-6 font-semibold">
              <Link href="/products" onClick={() => setOpen(false)}>
                {t("common.startShopping")}
              </Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 divide-y divide-line overflow-y-auto px-6">
              {items.map((line) => (
                <CartLineRow
                  key={line.variantId}
                  line={line}
                  compact
                  onQuantityChange={setQuantity}
                  onRemove={removeItem}
                />
              ))}
            </div>

            <div className="border-t border-line bg-concrete px-6 py-5">
              {remaining > 0 ? (
                <p className="up-xs mb-3 text-grey-2">
                  {t("cart.freeShippingRemaining", { amount: formatMoney(remaining) })}
                </p>
              ) : (
                <p className="up-xs mb-3 text-ok">{t("cart.freeShippingUnlocked")}</p>
              )}

              <div className="flex items-baseline justify-between">
                <span className="up-xs text-grey-2">{t("cart.subtotal")}</span>
                <span className="text-lg font-bold tabular-nums">
                  {formatMoney(totals.subtotalCents)}
                </span>
              </div>
              <p className="mt-1 text-xs text-grey">{t("cart.drawerNote")}</p>

              <div className="mt-4 grid gap-2">
                <Button asChild size="lg" className="up-sm h-12 font-semibold">
                  <Link href="/checkout" onClick={() => setOpen(false)}>
                    {t("cart.checkout")}
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="up-sm h-11 font-semibold">
                  <Link href="/cart" onClick={() => setOpen(false)}>
                    {t("cart.viewBag")}
                  </Link>
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
