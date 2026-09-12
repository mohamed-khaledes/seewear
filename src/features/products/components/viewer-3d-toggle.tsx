"use client";

import { Box } from "lucide-react";

import { cn } from "@/lib/utils";
import { useViewer3DStore } from "@/stores/viewer-3d-store";

/**
 * The opt-in. 3D is off until the shopper asks for it, because turning it on
 * downloads a WebGL runtime and a mesh per garment — not something to spend on
 * someone's data without being asked.
 */
export function Viewer3DToggle({ className }: { className?: string }) {
  const enabled = useViewer3DStore((state) => state.enabled);
  const hydrated = useViewer3DStore((state) => state.hydrated);
  const toggle = useViewer3DStore((state) => state.toggle);

  // Render the off state until localStorage has been read, so the server and
  // the first client paint agree.
  const on = hydrated && enabled;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      className={cn(
        "up-xs inline-flex items-center gap-2 border px-3 py-2 transition-colors",
        on
          ? "border-ink bg-ink text-white"
          : "border-line bg-paper text-grey-2 hover:border-ink hover:text-ink",
        className,
      )}
    >
      <Box className="size-3.5" strokeWidth={1.8} />
      3D view
      <span className="sr-only">{on ? " (on)" : " (off)"}</span>
    </button>
  );
}
