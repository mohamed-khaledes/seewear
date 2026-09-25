"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";

import { Price } from "@/components/common/price";
import { ProductShot } from "@/components/common/product-shot";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { primaryImage } from "@/features/products/services/utils/variants";
import { useProductSearch } from "@/features/search/hooks/use-product-search";
import { useT } from "@/lib/i18n";

export function SearchDialog() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const router = useRouter();
  const { data, isFetching } = useProductSearch(term);

  // ⌘K / Ctrl+K opens it from anywhere.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((current) => !current);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = term.trim();
    if (!trimmed) return;
    setOpen(false);
    router.push(`/products?q=${encodeURIComponent(trimmed)}`);
  }

  const results = data ?? [];
  const searching = term.trim().length >= 2;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        aria-label={t("filters.searchTitle")}
        className="text-white/90 transition-opacity hover:text-white"
      >
        <Search className="size-[17px]" strokeWidth={1.5} />
      </DialogTrigger>

      <DialogContent className="top-24 max-w-xl translate-y-0 gap-0 p-0">
        <DialogTitle className="sr-only">{t("filters.searchStore")}</DialogTitle>
        <DialogDescription className="sr-only">
          {t("filters.searchHint")}
        </DialogDescription>

        <form onSubmit={submit} className="border-b border-line p-3">
          <div className="flex items-center gap-2">
            <Search className="size-4 shrink-0 text-grey" />
            <Input
              autoFocus
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder={t("filters.searchPlaceholderLong")}
              className="h-10 border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0"
            />
          </div>
        </form>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {!searching ? (
            <p className="px-3 py-6 text-center text-sm text-grey-2">
              Type at least two characters to search.
            </p>
          ) : isFetching && results.length === 0 ? (
            <div className="grid gap-2 p-1">
              {[0, 1, 2].map((row) => (
                <Skeleton key={row} className="h-16 w-full" />
              ))}
            </div>
          ) : results.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-grey-2">
              {t("filters.searchNothing", { term: term.trim() })}
            </p>
          ) : (
            <ul>
              {results.map((product) => {
                const image = primaryImage(product);
                return (
                  <li key={product.id}>
                    <Link
                      href={`/product/${product.slug}`}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-concrete"
                    >
                      <div className="w-12 shrink-0 overflow-hidden rounded border border-line bg-white">
                        <ProductShot
                          src={image?.url}
                          alt={image?.alt ?? product.name}
                          sizes="48px"
                          className="aspect-square"
                          imageClassName="p-1"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{product.name}</p>
                        <p className="up-xs mt-0.5 text-grey-2">
                          {product.category?.name ?? "SEEWEAR"}
                        </p>
                      </div>
                      <Price
                        priceCents={product.price_cents}
                        compareAtCents={product.compare_at_cents}
                        className="text-xs"
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {searching && results.length > 0 ? (
          <button
            type="button"
            onClick={submit}
            className="up-xs border-t border-line px-4 py-3 text-start font-semibold text-grey-2 transition-colors hover:text-ink"
          >
            See all results for “{term.trim()}” →
          </button>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
