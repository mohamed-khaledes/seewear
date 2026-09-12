"use client";

import { useCallback, useEffect, useRef } from "react";

import { useViewer3DStore } from "@/stores/viewer-3d-store";

type PeekArgs = {
  modelUrl: string | null;
  name: string;
  colorName: string | null;
};

/**
 * Hover handlers for a product card's 3D peek.
 *
 * Three guards, all of them load-bearing:
 *  - the shopper has turned 3D on;
 *  - this colourway actually has a mesh;
 *  - the device has a real pointer. A hover panel on a touchscreen would be
 *    triggered by taps meant for the card itself.
 *
 * The short delay stops a mouse crossing the grid from firing eleven times.
 */
/**
 * Dock to the far edge from whatever was hovered or clicked. A panel sitting on
 * top of the cards you are about to reach makes the rest of the page unusable.
 */
export function peekSideFor(element: HTMLElement): "left" | "right" {
  const box = element.getBoundingClientRect();
  return box.left + box.width / 2 > window.innerWidth / 2 ? "left" : "right";
}

export function useModelPeek({ modelUrl, name, colorName }: PeekArgs) {
  const enabled = useViewer3DStore((state) => state.enabled);
  const hydrated = useViewer3DStore((state) => state.hydrated);
  const openPeek = useViewer3DStore((state) => state.openPeek);

  const timer = useRef<number | null>(null);
  const active = hydrated && enabled && Boolean(modelUrl);

  const cancel = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  useEffect(() => cancel, [cancel]);

  const onMouseEnter = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      if (!active || !modelUrl) return;
      if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

      const side = peekSideFor(event.currentTarget);

      cancel();
      timer.current = window.setTimeout(() => {
        openPeek({ modelUrl, name, colorName, side });
      }, 220);
    },
    [active, modelUrl, name, colorName, openPeek, cancel],
  );

  return { active, onMouseEnter, onMouseLeave: cancel };
}
