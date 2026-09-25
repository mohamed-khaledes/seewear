"use client";

import { useCallback } from "react";
import { toast } from "sonner";

import { useT } from "@/lib/i18n";
import { useCartStore } from "@/features/cart/store/cart-store";
import { useUiStore } from "@/stores/ui-store";
import type { CartLine } from "@/features/cart/types";

type AddOptions = { openDrawer?: boolean; silent?: boolean };

export function useAddToBag() {
  const t = useT();
  const addItem = useCartStore((state) => state.addItem);
  const openCartDrawer = useUiStore((state) => state.openCartDrawer);

  return useCallback(
    (line: CartLine, { openDrawer = false, silent = false }: AddOptions = {}) => {
      if (line.maxStock <= 0) {
        toast.error(t("cart.soldOutInThatSize", { name: line.name }));
        return false;
      }

      addItem(line);

      if (openDrawer) openCartDrawer();
      else if (!silent) {
        toast.success(t("cart.addedToBag"), {
          description: [line.name, line.color, line.size].filter(Boolean).join(" · "),
          action: { label: t("cart.viewBag"), onClick: openCartDrawer },
        });
      }

      return true;
    },
    [addItem, openCartDrawer, t],
  );
}
