"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import { VIEWER_3D_STORAGE_KEY } from "@/config/constants";

type Peek = {
  modelUrl: string;
  name: string;
  colorName: string | null;
  /** Which edge to dock to — always the one the hovered card is not near. */
  side: "left" | "right";
} | null;

type Viewer3DState = {
  /** Opt-in. The viewer pulls ~300KB of WebGL code, so nothing loads until on. */
  enabled: boolean;
  /** False until localStorage has been read — guards the SSR/client mismatch. */
  hydrated: boolean;
  /** What the hover panel is showing, or null when it is closed. */
  peek: Peek;

  setHydrated: () => void;
  setEnabled: (enabled: boolean) => void;
  toggle: () => void;
  openPeek: (peek: NonNullable<Peek>) => void;
  closePeek: () => void;
};

/**
 * The 3D preference, and the one product the hover panel is currently showing.
 *
 * The preference is persisted; the peek deliberately is not — a panel that
 * reopened itself on reload, pointing at a product the shopper has navigated
 * away from, would be a bug rather than a convenience.
 */
export const useViewer3DStore = create<Viewer3DState>()(
  persist(
    (set) => ({
      enabled: false,
      hydrated: false,
      peek: null,

      setHydrated: () => set({ hydrated: true }),
      setEnabled: (enabled) => set({ enabled, peek: enabled ? null : null }),
      toggle: () => set((state) => ({ enabled: !state.enabled, peek: null })),
      openPeek: (peek) => set({ peek }),
      closePeek: () => set({ peek: null }),
    }),
    {
      name: VIEWER_3D_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ enabled: state.enabled }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);
