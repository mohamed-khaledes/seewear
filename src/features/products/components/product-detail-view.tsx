"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronRight, Truck } from "lucide-react";

import { Price } from "@/components/common/price";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { cn, discountPercent, formatMoney } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { useAddToBag, usePricingRules } from "@/features/cart";
import { useSessionUser } from "@/features/auth";
import { WishlistButton } from "@/features/wishlist";
import { StockAlertForm } from "@/features/products/components/stock-alert-form";
import type { ProductDetail } from "@/features/products/types";
import {
  colorOptions,
  findVariant,
  hasAnyModel,
  imageForColor,
  modelForColor,
  priceCentsFor,
  sizeOptions,
} from "@/features/products/services/utils/variants";
import { toCartLine } from "@/features/products/services/utils/to-cart-line";
import { ProductStage } from "@/features/products/components/product-stage";

export function ProductDetailView({ product }: { product: ProductDetail }) {
  const t = useT();
  const colors = useMemo(() => colorOptions(product), [product]);
  const [color, setColor] = useState<string | null>(
    colors.find((option) => option.inStock)?.name ?? colors[0]?.name ?? null,
  );
  const sizes = useMemo(() => sizeOptions(product, color), [product, color]);
  const [size, setSize] = useState<string | null>(
    sizes.find((option) => option.stock > 0)?.name ?? null,
  );

  const addToBag = useAddToBag();
  const rules = usePricingRules();
  const user = useSessionUser();
  const variant = findVariant(product, color, size);
  const price = priceCentsFor(product, variant);
  const image = imageForColor(product, color);
  const off = discountPercent(price, product.compare_at_cents);

  function pickColor(next: string) {
    setColor(next);
    const available = sizeOptions(product, next);
    const keep = available.find((option) => option.name === size && option.stock > 0);
    setSize(keep?.name ?? available.find((option) => option.stock > 0)?.name ?? null);
  }

  function add() {
    if (!variant) return;
    addToBag(toCartLine(product, variant), { openDrawer: true });
  }

  const soldOut = !variant || variant.stock === 0;

  return (
    <div className="grid gap-px bg-line lg:grid-cols-2">
      <div className="bg-paper">
        <ProductStage
          imageUrl={image?.url}
          imageAlt={image?.alt ?? product.name}
          modelUrl={modelForColor(product, color)}
          productHasAnyModel={hasAnyModel(product)}
          productName={product.name}
        />
      </div>

      <div className="bg-paper px-5 py-8 lg:px-10 lg:py-12">
        <nav aria-label={t("product.breadcrumb")} className="up-xs flex items-center gap-1 text-grey-2">
          <Link href="/products" className="hover:text-ink">
            {t("nav.shop")}
          </Link>
          {product.category ? (
            <>
              <ChevronRight className="size-3 rtl:-scale-x-100" />
              <Link
                href={`/products?category=${product.category.slug}`}
                className="hover:text-ink"
              >
                {product.category.name}
              </Link>
            </>
          ) : null}
        </nav>

        <h1 className="mt-4 text-2xl font-bold tracking-tight lg:text-3xl">
          SEEWEAR {product.name}
        </h1>

        <div className="mt-3 flex items-center gap-3">
          <Price
            priceCents={price}
            compareAtCents={product.compare_at_cents}
            className="text-lg"
          />
          {off ? (
            <span className="up-xs font-semibold text-sale">
              {t("product.percentOff", { percent: off })}
            </span>
          ) : null}
        </div>

        {product.description ? (
          <p className="mt-5 max-w-prose text-sm leading-relaxed text-grey-2">
            {product.description}
          </p>
        ) : null}

        {colors.length > 0 ? (
          <fieldset className="mt-8">
            <legend className="up-xs mb-3 text-grey-2">
              {t("product.colour")} — <span className="text-ink">{color}</span>
            </legend>
            <div className="flex flex-wrap gap-2">
              {colors.map((option) => (
                <button
                  key={option.name}
                  type="button"
                  onClick={() => pickColor(option.name)}
                  aria-pressed={color === option.name}
                  aria-label={option.name}
                  title={option.name}
                  className={cn(
                    "size-8 rounded-full border transition-all",
                    color === option.name
                      ? "border-ink ring-2 ring-ink ring-offset-2"
                      : "border-black/15 hover:border-black/40",
                    !option.inStock && "opacity-40",
                  )}
                  style={{ background: option.hex ?? "#ddd" }}
                />
              ))}
            </div>
          </fieldset>
        ) : null}

        {sizes.length > 0 ? (
          <fieldset className="mt-7">
            <legend className="up-xs mb-3 flex w-full items-center justify-between text-grey-2">
              <span>{t("product.size")}</span>
              <Link href="/help/size-guide" className="underline underline-offset-2">
                {t("product.sizeGuide")}
              </Link>
            </legend>
            <div className="flex flex-wrap gap-2">
              {sizes.map((option) => (
                // Sold-out sizes stay selectable: choosing one is how a shopper
                // asks to be told when it is back.
                <button
                  key={option.name}
                  type="button"
                  onClick={() => setSize(option.name)}
                  aria-pressed={size === option.name}
                  aria-label={
                    option.stock === 0
                      ? `${option.name} — ${t("product.soldOut")}`
                      : option.name
                  }
                  className={cn(
                    "up-xs min-w-14 border px-3 py-3 font-semibold transition-colors",
                    size === option.name
                      ? "border-ink bg-ink text-white"
                      : "border-line hover:border-ink",
                    option.stock === 0 && "line-through",
                    option.stock === 0 && size !== option.name && "text-grey",
                  )}
                >
                  {option.name}
                </button>
              ))}
            </div>
            {variant && variant.stock > 0 && variant.stock <= 5 ? (
              <p className="up-xs mt-3 text-warn">
                {t("product.onlyLeft", { count: variant.stock })}
              </p>
            ) : null}
          </fieldset>
        ) : null}

        <div className="mt-8 flex gap-2">
          <Button
            size="lg"
            disabled={soldOut}
            onClick={add}
            className="up-sm h-12 flex-1 font-semibold"
          >
            {soldOut ? t("product.soldOut") : t("product.addToBag")}
          </Button>
          <WishlistButton
            productId={product.id}
            productName={product.name}
            variant="labelled"
          />
        </div>

        {soldOut && variant ? (
          <div className="mt-3">
            <StockAlertForm
              key={variant.id}
              variantId={variant.id}
              label={[variant.color, variant.size].filter(Boolean).join(" · ")}
              defaultEmail={user?.email ?? ""}
            />
          </div>
        ) : null}

        <p className="up-xs mt-4 flex items-center gap-2 text-grey-2">
          <Truck className="size-3.5" />
          {t("product.freeShippingOver", {
            amount: formatMoney(rules.freeShippingThresholdCents),
          })}
        </p>

        <Accordion type="single" collapsible className="mt-8 border-t border-line">
          <AccordionItem value="details">
            <AccordionTrigger className="up-sm font-semibold">
              {t("product.details")}
            </AccordionTrigger>
            <AccordionContent className="text-sm leading-relaxed text-grey-2">
              {product.description ?? t("product.detailsBody")}
              {variant?.sku ? (
                <span className="mt-2 block text-xs text-grey">SKU {variant.sku}</span>
              ) : null}
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="shipping">
            <AccordionTrigger className="up-sm font-semibold">
              {t("product.shippingReturns")}
            </AccordionTrigger>
            <AccordionContent className="text-sm leading-relaxed text-grey-2">
              {t("product.shippingBody", {
                amount: formatMoney(rules.freeShippingThresholdCents),
              })}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}
