"use client";

import dynamic from "next/dynamic";
import { Box, Camera } from "lucide-react";

import { ProductShot } from "@/components/common/product-shot";
import { cn } from "@/lib/utils";
import { useViewer3DStore } from "@/stores/viewer-3d-store";
import { useT } from "@/lib/i18n";

const ModelViewer = dynamic(
  () => import("@/components/common/model-viewer").then((m) => m.ModelViewer),
  { ssr: false },
);

/**
 * The stage box: square, but never taller than the screen leaves it.
 *
 * `--site-chrome-h` is the announcement strip plus the sticky header, so the
 * cap guarantees the header and the whole garment share the first screen. It
 * matters on laptops: a 50vw column at 1366x768 wanted 737px of height against
 * 677px of room, and the bottom of the piece fell below the fold. `max-h` only
 * bites when it has to, so tall screens still get the full square.
 */
const STAGE_BOX =
  "relative aspect-square w-full max-h-[calc(100dvh-var(--site-chrome-h))] max-w-[calc(100dvh-var(--site-chrome-h))]";

type ProductStageProps = {
  imageUrl?: string | null;
  imageAlt: string;
  /** Null when this colourway has no mesh — the switch is then not offered. */
  modelUrl: string | null;
  /** True when some other colourway has one, which is worth saying. */
  productHasAnyModel: boolean;
  productName: string;
};

/**
 * The product image, with a photo/3D switch when a mesh exists for the chosen
 * colourway.
 *
 * The switch is shown even while 3D is off globally: someone who lands on a
 * product page and wants to spin it should not have to find a preference first.
 * Flipping it here turns the preference on, which is also what lights up the
 * hover previews in the grid.
 */
export function ProductStage({
  imageUrl,
  imageAlt,
  modelUrl,
  productHasAnyModel,
  productName,
}: ProductStageProps) {
  const t = useT();
  const enabled = useViewer3DStore((state) => state.enabled);
  const hydrated = useViewer3DStore((state) => state.hydrated);
  const setEnabled = useViewer3DStore((state) => state.setEnabled);

  const showing3D = hydrated && enabled && Boolean(modelUrl);

  return (
    // The plate colour runs the full column so the square can shrink to fit a
    // short screen without leaving white bars beside a grey photograph.
    <div className="flex justify-center bg-[#f6f6f4]">
      <div className={STAGE_BOX}>
        {showing3D && modelUrl ? (
          <ModelViewer
            key={modelUrl}
            src={modelUrl}
            alt={`${productName} in 3D`}
            poster={imageUrl ?? undefined}
            className="size-full"
          />
        ) : (
          <ProductShot
            src={imageUrl}
            alt={imageAlt}
            priority
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="size-full"
          />
        )}

        {modelUrl ? (
          <div className="absolute bottom-4 start-4 flex border border-line bg-paper/95">
            <StageTab
              active={!showing3D}
              onClick={() => setEnabled(false)}
              icon={<Camera className="size-3.5" strokeWidth={1.8} />}
              label={t("product.photo")}
            />
            <StageTab
              active={showing3D}
              onClick={() => setEnabled(true)}
              icon={<Box className="size-3.5" strokeWidth={1.8} />}
              label="3D"
            />
          </div>
        ) : null}

        {showing3D ? (
          <p className="up-xs pointer-events-none absolute bottom-6 end-4 text-grey-2">
            {t("product.dragToSpin")}
          </p>
        ) : null}

        {/* Only when this colour has no mesh but another one does — otherwise
            the shopper is left wondering why the switch vanished. */}
        {!modelUrl && productHasAnyModel ? (
          <p className="up-xs absolute bottom-4 start-4 bg-paper/95 px-2 py-1.5 text-grey-2">
            3D not scanned for this colour yet
          </p>
        ) : null}
      </div>
    </div>
  );
}

function StageTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "up-xs flex items-center gap-1.5 px-3 py-2 transition-colors",
        active ? "bg-ink text-white" : "text-grey-2 hover:text-ink",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
