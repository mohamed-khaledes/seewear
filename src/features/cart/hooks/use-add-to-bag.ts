"use client";

import { useCallback } from "react";
import { toast } from "sonner";

import { useCartStore } from "@/features/cart/store/cart-store";
import { useUiStore } from "@/stores/ui-store";
import type { CartLine } from "@/features/cart/types";

type AddOptions = { openDrawer?: boolean; silent?: boolean };

export function useAddToBag() {
  const addItem = useCartStore((state) => state.addItem);
  const openCartDrawer = useUiStore((state) => state.openCartDrawer);

  return useCallback(
    (line: CartLine, { openDrawer = false, silent = false }: AddOptions = {}) => {
      if (line.maxStock <= 0) {
        toast.error(`${line.name} is sold out in that size.`);
        return false;
      }

      addItem(line);

      if (openDrawer) openCartDrawer();
      else if (!silent) {
        toast.success("Added to bag", {
          description: [line.name, line.color, line.size].filter(Boolean).join(" · "),
          action: { label: "View bag", onClick: openCartDrawer },
        });
      }

      return true;
    },
    [addItem, openCartDrawer],
  );
}
