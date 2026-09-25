"use client";

import { ShoppingBag } from "lucide-react";

import { useCart } from "@/features/cart/hooks/use-cart";
import { useUiStore } from "@/stores/ui-store";
import { useT } from "@/lib/i18n";

export function BagButton() {
  const t = useT();
  const { itemCount, hydrated } = useCart();
  const openCartDrawer = useUiStore((state) => state.openCartDrawer);

  return (
    <button
      type="button"
      onClick={openCartDrawer}
      aria-label={
        hydrated && itemCount > 0
          ? t("cart.bagCount", { count: itemCount })
          : t("cart.bagEmpty")
      }
      className="relative text-white/90 transition-opacity hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
    >
      <ShoppingBag className="size-[17px]" strokeWidth={1.5} />
      {hydrated && itemCount > 0 ? (
        <span className="absolute -end-2.5 -top-2 grid size-4 place-items-center rounded-full bg-white text-[9px] font-bold tabular-nums text-ink">
          {itemCount > 9 ? "9+" : itemCount}
        </span>
      ) : null}
    </button>
  );
}
