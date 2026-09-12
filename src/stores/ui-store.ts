"use client";

import { create } from "zustand";

type UiState = {
  cartDrawerOpen: boolean;
  mobileNavOpen: boolean;
  openCartDrawer: () => void;
  closeCartDrawer: () => void;
  setCartDrawerOpen: (open: boolean) => void;
  setMobileNavOpen: (open: boolean) => void;
};

/** Cross-cutting UI state — nothing here survives a reload on purpose. */
export const useUiStore = create<UiState>((set) => ({
  cartDrawerOpen: false,
  mobileNavOpen: false,
  openCartDrawer: () => set({ cartDrawerOpen: true }),
  closeCartDrawer: () => set({ cartDrawerOpen: false }),
  setCartDrawerOpen: (open) => set({ cartDrawerOpen: open }),
  setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
}));
