import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Pager for the admin tables. Server-rendered links, so the page lives in the
 * URL and survives a refresh or a shared link — the same way the filters do.
 */
export function TablePagination({
  page,
  totalPages,
  total,
  perPage,
  basePath,
  params = {},
  label = "rows",
}: {
  page: number;
  totalPages: number;
  total: number;
  perPage: number;
  basePath: string;
  /** Filters to carry across, so paging never silently drops them. */
  params?: Record<string, string | undefined>;
  label?: string;
}) {
  if (totalPages <= 1) return null;

  const href = (target: number) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value) query.set(key, value);
    }
    if (target > 1) query.set("page", String(target));
    const search = query.toString();
    return search ? `${basePath}?${search}` : basePath;
  };

  const first = (page - 1) * perPage + 1;
  const last = Math.min(page * perPage, total);

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3"
    >
      <p className="text-xs text-[#666] tabular-nums">
        {first}–{last} of {total} {label}
      </p>

      <div className="flex items-center gap-1.5">
        <PagerLink href={href(page - 1)} disabled={page <= 1} label="Previous page">
          <ChevronLeft className="size-4" />
        </PagerLink>

        <span className="px-2 text-xs tabular-nums text-[#444]">
          Page {page} of {totalPages}
        </span>

        <PagerLink href={href(page + 1)} disabled={page >= totalPages} label="Next page">
          <ChevronRight className="size-4" />
        </PagerLink>
      </div>
    </nav>
  );
}

function PagerLink({
  href,
  disabled,
  label,
  children,
}: {
  href: string;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  const className = cn(
    "grid size-8 place-items-center rounded-md border text-[#444] transition-colors",
    disabled
      ? "pointer-events-none border-line opacity-35"
      : "border-line hover:border-ink hover:text-ink",
  );

  // A disabled control should not be a link at all, or the keyboard will still
  // land on it and follow it.
  if (disabled) {
    return (
      <span aria-disabled="true" aria-label={label} className={className}>
        {children}
      </span>
    );
  }

  return (
    <Link href={href} aria-label={label} className={className}>
      {children}
    </Link>
  );
}
