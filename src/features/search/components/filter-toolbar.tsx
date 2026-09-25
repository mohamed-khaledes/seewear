"use client";

import { SlidersHorizontal, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SORT_OPTIONS } from "@/config/constants";
import { formatMoney } from "@/lib/utils";
import { useDir, useT } from "@/lib/i18n";
import { activeFilterCount } from "@/features/products/services/utils/filters";
import type { ProductFilters, ProductSort } from "@/features/products";
import { Viewer3DToggle } from "@/features/products/components/viewer-3d-toggle";
import { FilterPanel } from "@/features/search/components/filter-panel";
import { useFilterNavigation } from "@/features/search/hooks/use-filter-navigation";

export function FilterToolbar({
  filters,
  total,
}: {
  filters: ProductFilters;
  total: number;
}) {
  const t = useT();
  const dir = useDir();
  const { apply, clearAll } = useFilterNavigation(filters);
  const active = activeFilterCount(filters);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 lg:px-6">
      <div className="flex items-center gap-3">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="lg" className="up-sm h-10 font-semibold lg:hidden">
              <SlidersHorizontal />
              {t("filters.filters")}
              {active > 0 ? ` (${active})` : ""}
            </Button>
          </SheetTrigger>
          <SheetContent
            side={dir === "rtl" ? "right" : "left"}
            className="w-full overflow-y-auto sm:max-w-sm"
          >
            <SheetHeader>
              <SheetTitle className="up-sm font-bold">{t("filters.filters")}</SheetTitle>
            </SheetHeader>
            <FilterPanel filters={filters} className="px-4 pb-10" />
          </SheetContent>
        </Sheet>

        <p className="up-xs text-grey-2">{t("orders.pieceCount", { count: total })}</p>
      </div>

      <div className="flex items-center gap-3">
        {/* Hidden below lg: the peek panel it controls is desktop-only, because
            a hover preview needs a pointer that can hover. */}
        <Viewer3DToggle className="hidden h-10 lg:inline-flex" />

        <ActiveFilterChips filters={filters} />
        {active > 0 ? (
          <button
            type="button"
            onClick={clearAll}
            className="up-xs hidden text-grey-2 transition-colors hover:text-ink sm:inline"
          >
            {t("filters.clear")}
          </button>
        ) : null}

        <Select
          value={filters.sort}
          onValueChange={(value) => apply({ sort: value as ProductSort })}
        >
          <SelectTrigger size="sm" className="h-10 w-[168px]" aria-label={t("filters.sort")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {t(option.key)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function ActiveFilterChips({ filters }: { filters: ProductFilters }) {
  const t = useT();
  const { apply, toggleColor, toggleSize, setCategory } = useFilterNavigation(filters);

  const chips: { key: string; label: string; remove: () => void }[] = [];

  if (filters.category) {
    chips.push({
      key: `category-${filters.category}`,
      label: filters.category,
      remove: () => setCategory(filters.category),
    });
  }
  for (const color of filters.colors) {
    chips.push({ key: `color-${color}`, label: color, remove: () => toggleColor(color) });
  }
  for (const size of filters.sizes) {
    chips.push({ key: `size-${size}`, label: size, remove: () => toggleSize(size) });
  }
  if (filters.minCents !== null || filters.maxCents !== null) {
    chips.push({
      key: "price",
      label: `${filters.minCents !== null ? formatMoney(filters.minCents) : t("filters.any")} – ${
        filters.maxCents !== null ? formatMoney(filters.maxCents) : t("filters.any")
      }`,
      remove: () => apply({ minCents: null, maxCents: null }),
    });
  }
  if (filters.onSale) {
    chips.push({
      key: "sale",
      label: t("filters.onSale"),
      remove: () => apply({ onSale: false }),
    });
  }
  if (filters.inStock) {
    chips.push({
      key: "stock",
      label: t("filters.inStock"),
      remove: () => apply({ inStock: false }),
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="hidden flex-wrap items-center gap-1.5 md:flex">
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={chip.remove}
          className="up-xs inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-1 text-grey-2 transition-colors hover:border-ink hover:text-ink"
        >
          {chip.label}
          <X className="size-3" />
        </button>
      ))}
    </div>
  );
}
