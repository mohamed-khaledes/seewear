"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

// The <model-viewer> custom element is typed in src/types/model-viewer.d.ts.

/**
 * The library defines the custom element as a side effect of importing, and it
 * is ~300KB of WebGL. Import it once, on demand, and only in the browser — this
 * module is never pulled in unless the shopper has turned 3D on.
 */
let loader: Promise<unknown> | null = null;
function loadModelViewer(): Promise<unknown> {
  loader ??= import("@google/model-viewer");
  return loader;
}

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeToMotionPreference(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

type ModelViewerProps = {
  src: string;
  alt: string;
  /** Shown while the mesh downloads, and if WebGL is unavailable. */
  poster?: string;
  className?: string;
  autoRotate?: boolean;
  disableZoom?: boolean;
};

export function ModelViewer({
  src,
  alt,
  poster,
  className,
  autoRotate = true,
  disableZoom = false,
}: ModelViewerProps) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    loadModelViewer().then(
      () => alive.current && setReady(true),
      () => alive.current && setFailed(true),
    );
    return () => {
      alive.current = false;
    };
  }, []);

  // Someone who asked for less motion should not get a spinning garment. The
  // server has no media queries, so it always renders the "no preference" case.
  const reducedMotion = useSyncExternalStore(
    subscribeToMotionPreference,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );

  if (failed) {
    return (
      <div className={cn("grid place-items-center bg-[#f6f6f4] p-6", className)}>
        <p className="up-xs max-w-[26ch] text-center text-grey-2">
          This browser cannot show the 3D view. The photographs are still there.
        </p>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className={cn("grid place-items-center bg-[#f6f6f4]", className)}>
        <Loader2 className="size-5 animate-spin text-grey" />
        <span className="sr-only">Loading the 3D view</span>
      </div>
    );
  }

  return (
    <model-viewer
      src={src}
      alt={alt}
      poster={poster}
      camera-controls=""
      {...(autoRotate && !reducedMotion ? { "auto-rotate": "" } : {})}
      auto-rotate-delay="600"
      rotation-per-second="18deg"
      shadow-intensity="0.9"
      exposure="1.05"
      interaction-prompt="none"
      touch-action="pan-y"
      {...(disableZoom ? { "disable-zoom": "" } : {})}
      className={cn("block bg-[#f6f6f4]", className)}
      style={{ width: "100%", height: "100%" }}
    />
  );
}
