"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import { CART_STORAGE_KEY } from "@/config/constants";
import type { CartLine } from "@/features/cart/types";

/**
 * Stamped on carts that were persisted before the bag recorded its owner. Such
 * a cart is treated as already belonging to whoever is signed in, because the
 * old code mirrored every signed-in cart into the database — merging it again
 * would be the double-counting this marker exists to stop.
 */
export const LEGACY_OWNER = "legacy";

type CartState = {
  items: CartLine[];
  /**
   * Whose bag this is: a user id, `null` for a guest, or {@link LEGACY_OWNER}.
   * Persisted, because the answer has to survive the browser being closed —
   * it is what separates "a guest cart to merge into the account" from "this
   * account's cart, already in the database".
   */
  ownerId: string | null;
  /** False until persisted state has been read — guards SSR/client mismatch. */
  hydrated: boolean;
  setHydrated: () => void;
  addItem: (line: CartLine) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  removeItem: (variantId: string) => void;
  replaceItems: (items: CartLine[]) => void;
  /** Take these lines as the given account's bag, in one write. */
  adopt: (items: CartLine[], ownerId: string) => void;
  /** Hand the bag back to nobody — used when the account signs out. */
  resetToGuest: () => void;
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
      ownerId: null,
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

      adopt: (items, ownerId) => set({ items, ownerId }),

      resetToGuest: () => set({ items: [], ownerId: null }),

      clear: () => set({ items: [] }),
    }),
    {
      name: CART_STORAGE_KEY,
      version: 2,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items, ownerId: state.ownerId }),
      migrate: (persisted, version) => {
        const state = (persisted ?? {}) as Partial<CartState>;
        // v1 carts carry no owner. Marking them legacy rather than guest keeps
        // the next sign-in from summing a mirrored cart into itself.
        if (version < 2) return { ...state, ownerId: LEGACY_OWNER };
        return state;
      },
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);
