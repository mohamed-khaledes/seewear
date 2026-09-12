"use client";

import Link from "next/link";
import { useState } from "react";
import { Box, Check, Plus } from "lucide-react";

import { Price } from "@/components/common/price";
import { ProductShot } from "@/components/common/product-shot";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn, discountPercent } from "@/lib/utils";
import { useAddToBag } from "@/features/cart";
import { WishlistButton } from "@/features/wishlist";
import type { ProductListItem } from "@/features/products/types";
import {
  colorOptions,
  imageForColor,
  isSoldOut,
  modelForColor,
} from "@/features/products/services/utils/variants";
import { useModelPeek } from "@/features/products/hooks/use-model-peek";
import { toCartLine } from "@/features/products/services/utils/to-cart-line";

type ProductCardProps = {
  product: ProductListItem;
  priority?: boolean;
};

export function ProductCard({ product, priority = false }: ProductCardProps) {
  const colors = colorOptions(product);
  // The caption names colors[0] and quick-add bags colors[0], so show that
  // colour's shot. Taking images[0] instead put a white tee under "Navy".
  const image = imageForColor(product, colors[0]?.name ?? null);
  const soldOut = isSoldOut(product);
  const off = discountPercent(product.price_cents, product.compare_at_cents);

  const firstColor = colors[0]?.name ?? null;
  const peek = useModelPeek({
    modelUrl: modelForColor(product, firstColor),
    name: product.name,
    colorName: firstColor,
  });

  return (
    <article
      className="group relative overflow-hidden border border-line bg-paper"
      onMouseEnter={peek.onMouseEnter}
      onMouseLeave={peek.onMouseLeave}
    >
      <div className="relative">
        <Link href={`/product/${product.slug}`} className="block">
          <ProductShot
            src={image?.url}
            alt={image?.alt ?? product.name}
            priority={priority}
          />
        </Link>

        {/* The shots are full-bleed photographs, so every badge needs its own
            ground — bare text lands on the garment and stops being readable. */}
        {product.on_sale ? (
          <span className="up-xs pointer-events-none absolute right-2.5 top-2.5 bg-paper/90 px-1.5 py-1 text-grey-2">
            Sale
          </span>
        ) : null}

        {/* Only shown once 3D is on, and only where a mesh exists — otherwise it
            would promise a rotation most of the catalogue cannot do yet. */}
        {peek.active ? (
          <span
            className={cn(
              "up-xs pointer-events-none absolute right-2.5 flex items-center gap-1 bg-ink/90 px-1.5 py-1 text-white",
              product.on_sale ? "top-10" : "top-2.5",
            )}
          >
            <Box className="size-3" strokeWidth={2} />
            3D
          </span>
        ) : null}

        <WishlistButton
          productId={product.id}
          productName={product.name}
          className="absolute left-3 top-3 opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
        />

        {/* One row: a discounted item can also be sold out, and these two used
            to be absolutely positioned on the same corner. */}
        {soldOut || off ? (
          <div className="pointer-events-none absolute bottom-2.5 left-2.5 flex items-center gap-1.5">
            {soldOut ? (
              <span className="up-xs bg-paper/90 px-1.5 py-1 font-semibold text-grey-2">
                Sold out
              </span>
            ) : null}
            {off ? (
              <span className="up-xs bg-paper/90 px-1.5 py-1 font-semibold text-sale">
                {off}% Off
              </span>
            ) : null}
          </div>
        ) : null}

        {soldOut ? null : <QuickAdd product={product} />}
      </div>

      {/* Always stacked. A five-up card is ~200px wide and an EGP sale price is
          two long amounts, so name-beside-price wraps raggedly at every size. */}
      <div className="flex flex-col gap-1 border-t border-line px-3.5 pb-4 pt-3.5">
        <Link
          href={`/product/${product.slug}`}
          className="text-xs font-semibold leading-snug hover:underline"
        >
          SEEWEAR {product.name}
        </Link>
        <Price
          priceCents={product.price_cents}
          compareAtCents={product.compare_at_cents}
          className="text-xs"
        />
        <p className="up-xs text-grey-2">
          {colors[0]?.name ?? product.category?.name ?? "SEEWEAR"}
          {colors.length > 1 ? ` · ${colors.length} Colours` : ""}
        </p>
      </div>
    </article>
  );
}

/** The "+" on the shot: pick a size, and it lands in the bag. */
function QuickAdd({ product }: { product: ProductListItem }) {
  const addToBag = useAddToBag();
  const [open, setOpen] = useState(false);
  const [added, setAdded] = useState(false);

  const firstColor = colorOptions(product)[0]?.name ?? null;
  const variants = product.variants.filter(
    (variant) => !firstColor || variant.color === firstColor,
  );
  const inStock = variants.filter((variant) => variant.stock > 0);

  function add(variant: (typeof variants)[number]) {
    const ok = addToBag(toCartLine(product, variant));
    setOpen(false);
    if (ok) {
      setAdded(true);
      setTimeout(() => setAdded(false), 900);
    }
  }

  if (inStock.length === 0) return null;

  // One-size products skip the picker entirely.
  if (inStock.length === 1) {
    return (
      <button
        type="button"
        onClick={() => add(inStock[0])}
        aria-label={`Add ${product.name} to bag`}
        className={cn(
          "absolute bottom-2.5 right-3 grid size-7 place-items-center rounded-full border border-line bg-white text-ink transition-colors hover:border-ink hover:bg-ink hover:text-white",
        )}
      >
        {added ? <Check className="size-3.5" /> : <Plus className="size-3.5" />}
      </button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={`Choose a size for ${product.name}`}
        className="absolute bottom-2.5 right-3 grid size-7 place-items-center rounded-full border border-line bg-white text-ink transition-colors hover:border-ink hover:bg-ink hover:text-white"
      >
        {added ? <Check className="size-3.5" /> : <Plus className="size-3.5" />}
      </PopoverTrigger>

      <PopoverContent align="end" className="w-auto p-2">
        <p className="up-xs px-1 pb-2 text-grey-2">Pick a size</p>
        <div className="flex flex-wrap gap-1">
          {variants.map((variant) => (
            <button
              key={variant.id}
              type="button"
              disabled={variant.stock === 0}
              onClick={() => add(variant)}
              className="up-xs min-w-10 rounded border border-line px-2 py-2 font-semibold transition-colors hover:border-ink disabled:cursor-not-allowed disabled:text-grey disabled:line-through"
            >
              {variant.size ?? "One size"}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
