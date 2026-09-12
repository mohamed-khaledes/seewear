"use client";

import Link from "next/link";
import { Box, Minus, Plus, X } from "lucide-react";

import { ProductShot } from "@/components/common/product-shot";
import { cn, formatMoney } from "@/lib/utils";
import type { CartLine } from "@/features/cart/types";
import { modelForSlugColor } from "@/features/products/services/utils/variants";
import { useViewer3DStore } from "@/stores/viewer-3d-store";

type CartLineRowProps = {
  line: CartLine;
  onQuantityChange: (variantId: string, quantity: number) => void;
  onRemove: (variantId: string) => void;
  compact?: boolean;
};

export function CartLineRow({
  line,
  onQuantityChange,
  onRemove,
  compact = false,
}: CartLineRowProps) {
  const enabled = useViewer3DStore((state) => state.enabled);
  const hydrated = useViewer3DStore((state) => state.hydrated);
  const openPeek = useViewer3DStore((state) => state.openPeek);

  const modelUrl =
    hydrated && enabled ? modelForSlugColor(line.slug, line.color) : null;
  const atStockCeiling = line.quantity >= line.maxStock;

  return (
    <div className={cn("flex gap-4", compact ? "py-4" : "py-6")}>
      <div className={cn("relative shrink-0", compact ? "w-16" : "w-24")}>
        <Link
          href={`/product/${line.slug}`}
          className="block overflow-hidden rounded-md border border-line bg-white"
        >
          <ProductShot
            src={line.imageUrl}
            alt={line.name}
            sizes="96px"
            className="aspect-[1/1.1]"
          />
        </Link>

        {/* Spin the piece you are about to buy, where a mesh exists. Reuses the
            grid's single viewer panel rather than putting a WebGL canvas in
            every row of the bag. */}
        {modelUrl ? (
          <button
            type="button"
            onClick={() =>
              openPeek({
                modelUrl,
                name: line.name,
                colorName: line.color,
                // Always left here. The bag's order summary and its Checkout
                // button live on the right, and nothing may sit over those.
                side: "left",
              })
            }
            aria-label={`See ${line.name} in 3D`}
            className="up-xs absolute -bottom-1.5 -right-1.5 hidden items-center gap-1 border border-line bg-paper px-1.5 py-1 text-grey-2 shadow-sm transition-colors hover:border-ink hover:text-ink lg:flex"
          >
            <Box className="size-3" strokeWidth={2} />
            3D
          </button>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              href={`/product/${line.slug}`}
              className="block truncate text-sm font-semibold hover:underline"
            >
              {line.name}
            </Link>
            <p className="up-xs mt-1 text-grey-2">
              {[line.color, line.size].filter(Boolean).join(" · ") || "One size"}
            </p>
          </div>

          <button
            type="button"
            onClick={() => onRemove(line.variantId)}
            aria-label={`Remove ${line.name} from bag`}
            className="-m-1 rounded p-1 text-grey transition-colors hover:text-ink"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-3 flex items-end justify-between gap-3">
          <div className="inline-flex items-center rounded-md border border-line">
            <button
              type="button"
              onClick={() => onQuantityChange(line.variantId, line.quantity - 1)}
              aria-label="Decrease quantity"
              className="grid size-8 place-items-center text-grey-2 transition-colors hover:text-ink"
            >
              <Minus className="size-3.5" />
            </button>
            <span className="w-8 text-center text-sm font-semibold tabular-nums">
              {line.quantity}
            </span>
            <button
              type="button"
              disabled={atStockCeiling}
              onClick={() => onQuantityChange(line.variantId, line.quantity + 1)}
              aria-label="Increase quantity"
              className="grid size-8 place-items-center text-grey-2 transition-colors hover:text-ink disabled:opacity-30"
            >
              <Plus className="size-3.5" />
            </button>
          </div>

          <div className="text-right">
            <p className="text-sm font-semibold tabular-nums">
              {formatMoney(line.priceCents * line.quantity)}
            </p>
            {atStockCeiling ? (
              <p className="up-xs mt-1 text-warn">
                {line.maxStock} left
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
