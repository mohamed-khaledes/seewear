"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import { CART_STORAGE_KEY } from "@/config/constants";
import type { CartLine } from "@/features/cart/types";

type CartState = {
  items: CartLine[];
  /** False until persisted state has been read — guards SSR/client mismatch. */
  hydrated: boolean;
  setHydrated: () => void;
  addItem: (line: CartLine) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  removeItem: (variantId: string) => void;
  replaceItems: (items: CartLine[]) => void;
  clear: () => void;
};

function clamp(quantity: number, maxStock: number): number {
  const ceiling = maxStock > 0 ? maxStock : 1;
  return Math.max(1, Math.min(quantity, ceiling));
}

/**
 * The guest cart. Persisted to localStorage; merged into the user's DB cart on
 * login. Quantities are always capped at the stock known for the line.
 */
export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      hydrated: false,

      setHydrated: () => set({ hydrated: true }),

      addItem: (line) =>
        set((state) => {
          const existing = state.items.find(
            (item) => item.variantId === line.variantId,
          );

          if (!existing) {
            return {
              items: [
                ...state.items,
                { ...line, quantity: clamp(line.quantity, line.maxStock) },
              ],
            };
          }

          return {
            items: state.items.map((item) =>
              item.variantId === line.variantId
                ? {
                    ...item,
                    ...line,
                    quantity: clamp(item.quantity + line.quantity, line.maxStock),
                  }
                : item,
            ),
          };
        }),

      setQuantity: (variantId, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((item) => item.variantId !== variantId)
              : state.items.map((item) =>
                  item.variantId === variantId
                    ? { ...item, quantity: clamp(quantity, item.maxStock) }
                    : item,
                ),
        })),

      removeItem: (variantId) =>
        set((state) => ({
          items: state.items.filter((item) => item.variantId !== variantId),
        })),

      replaceItems: (items) => set({ items }),

      clear: () => set({ items: [] }),
    }),
    {
      name: CART_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);
