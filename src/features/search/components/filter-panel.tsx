"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatMoney, toEgp, toPiastres } from "@/lib/utils";
import { useCatalogFacets, useCategories } from "@/features/products/hooks/use-products";
import type { ProductFilters } from "@/features/products";
import { useFilterNavigation } from "@/features/search/hooks/use-filter-navigation";

export function FilterPanel({
  filters,
  className,
}: {
  filters: ProductFilters;
  className?: string;
}) {
  const { data: facets, isLoading: facetsLoading } = useCatalogFacets();
  const { data: categories } = useCategories();
  const { apply, toggleColor, toggleSize, setCategory, clearAll } =
    useFilterNavigation(filters);

  return (
    <div className={cn("grid gap-7", className)}>
      <FilterGroup title="Category">
        <div className="flex flex-wrap gap-1.5">
          {(categories ?? []).map((category) => (
            <Chip
              key={category.id}
              active={filters.category === category.slug}
              onClick={() => setCategory(category.slug)}
            >
              {category.name}
            </Chip>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup title="Colour">
        {facetsLoading ? (
          <Skeleton className="h-8 w-full" />
        ) : (
          <div className="grid gap-1.5">
            {(facets?.colors ?? []).map((color) => {
              const active = filters.colors.includes(color.name);
              return (
                <button
                  key={color.name}
                  type="button"
                  onClick={() => toggleColor(color.name)}
                  aria-pressed={active}
                  className="flex items-center gap-2.5 py-1 text-left text-sm"
                >
                  <span
                    className={cn(
                      "size-4 rounded-full border transition-shadow",
                      active
                        ? "border-ink ring-2 ring-ink ring-offset-2"
                        : "border-black/15",
                    )}
                    style={{ background: color.hex ?? "#ddd" }}
                  />
                  <span className={cn(active && "font-semibold")}>{color.name}</span>
                  <span className="ml-auto text-xs tabular-nums text-grey">
                    {color.count}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </FilterGroup>

      <FilterGroup title="Size">
        <div className="flex flex-wrap gap-1.5">
          {(facets?.sizes ?? []).map((size) => (
            <Chip
              key={size.name}
              active={filters.sizes.includes(size.name)}
              onClick={() => toggleSize(size.name)}
            >
              {size.name}
            </Chip>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup title="Price">
        <PriceRange
          key={`${filters.minCents}-${filters.maxCents}`}
          filters={filters}
          onApply={apply}
        />
        {facets ? (
          <p className="mt-2 text-xs text-grey">
            Catalogue runs {formatMoney(facets.priceRange.minCents)} to{" "}
            {formatMoney(facets.priceRange.maxCents)}
          </p>
        ) : null}
      </FilterGroup>

      <FilterGroup title="Show">
        <div className="flex flex-wrap gap-1.5">
          <Chip active={filters.onSale} onClick={() => apply({ onSale: !filters.onSale })}>
            On sale
          </Chip>
          <Chip active={filters.inStock} onClick={() => apply({ inStock: !filters.inStock })}>
            In stock
          </Chip>
        </div>
      </FilterGroup>

      <Button variant="outline" size="lg" className="up-sm font-semibold" onClick={clearAll}>
        Clear filters
      </Button>
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="up-xs mb-3 text-grey-2">{title}</h3>
      {children}
    </section>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3.5 py-1.5 text-xs transition-colors",
        active
          ? "border-ink bg-ink text-white"
          : "border-line bg-white text-[#444] hover:border-ink",
      )}
    >
      {children}
    </button>
  );
}

/** Price is typed in EGP and stored in the URL as piastres. */
function PriceRange({
  filters,
  onApply,
}: {
  filters: ProductFilters;
  onApply: (patch: Partial<ProductFilters>) => void;
}) {
  // Seeded from the URL; the parent remounts this with a key when the URL
  // changes, so there is no effect syncing props into state.
  const [min, setMin] = useState(() =>
    filters.minCents === null ? "" : String(Math.round(toEgp(filters.minCents))),
  );
  const [max, setMax] = useState(() =>
    filters.maxCents === null ? "" : String(Math.round(toEgp(filters.maxCents))),
  );

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const parsedMin = min.trim() === "" ? null : Number.parseInt(min, 10);
    const parsedMax = max.trim() === "" ? null : Number.parseInt(max, 10);

    onApply({
      minCents: parsedMin !== null && parsedMin >= 0 ? toPiastres(parsedMin) : null,
      maxCents: parsedMax !== null && parsedMax >= 0 ? toPiastres(parsedMax) : null,
    });
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-2">
      <Input
        inputMode="numeric"
        value={min}
        onChange={(event) => setMin(event.target.value)}
        placeholder="Min"
        aria-label="Minimum price in EGP"
        className="h-9"
      />
      <span className="text-grey">—</span>
      <Input
        inputMode="numeric"
        value={max}
        onChange={(event) => setMax(event.target.value)}
        placeholder="Max"
        aria-label="Maximum price in EGP"
        className="h-9"
      />
      <Button type="submit" variant="outline" size="sm" className="h-9 shrink-0">
        Go
      </Button>
    </form>
  );
}
