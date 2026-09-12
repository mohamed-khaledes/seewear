"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { useViewer3DStore } from "@/stores/viewer-3d-store";

// Keeps the WebGL bundle out of the page until a peek actually opens.
const ModelViewer = dynamic(
  () => import("@/components/common/model-viewer").then((m) => m.ModelViewer),
  { ssr: false },
);

/**
 * The panel that slides in when a shopper hovers a card with a mesh.
 *
 * Rendered once, at the layout, rather than per card: eleven cards each holding
 * their own WebGL canvas would be eleven contexts, and browsers cap those.
 */
export function ModelPeekPanel() {
  const peek = useViewer3DStore((state) => state.peek);
  const closePeek = useViewer3DStore((state) => state.closePeek);

  // Escape closes it — it is a transient overlay and needs a keyboard way out.
  useEffect(() => {
    if (!peek) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closePeek();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [peek, closePeek]);

  if (!peek) return null;

  return (
    <aside
      aria-label={`3D preview of ${peek.name}`}
      className={cn(
        "pointer-events-auto fixed top-1/2 z-40 hidden w-79 -translate-y-1/2 border border-line bg-paper shadow-[0_18px_50px_rgba(10,10,10,0.16)] lg:block",
        peek.side === "left" ? "left-5" : "right-5",
      )}
      // Leaving the panel closes it, so it never sits there stale.
      onMouseLeave={closePeek}
    >
      <div className="flex items-center justify-between border-b border-line px-3.5 py-2.5">
        <p className="up-xs text-grey-2">Turn it around</p>
        <button
          type="button"
          onClick={closePeek}
          aria-label="Close the 3D preview"
          className="text-grey-2 transition-colors hover:text-ink"
        >
          <X className="size-3.5" />
        </button>
      </div>

      <div className="h-79">
        <ModelViewer
          key={peek.modelUrl}
          src={peek.modelUrl}
          alt={`${peek.name} in 3D`}
          disableZoom
        />
      </div>

      <div className="border-t border-line px-3.5 py-3">
        <p className="text-xs font-semibold leading-snug">{peek.name}</p>
        {peek.colorName ? (
          <p className="up-xs mt-1 text-grey-2">{peek.colorName}</p>
        ) : null}
        <p className="mt-2 text-[11px] leading-relaxed text-grey">
          Drag to spin. Not every colourway has a 3D scan yet.
        </p>
      </div>
    </aside>
  );
}
