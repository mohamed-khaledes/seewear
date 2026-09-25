import Link from "next/link";

import { cn } from "@/lib/utils";

export type Chip = { label: string; value: string; count?: number };

/**
 * Server-rendered filter chips — each one is a link, so the filter state lives
 * in the URL and survives a refresh.
 */
export function FilterChips({
  chips,
  active,
  basePath,
  paramName = "filter",
  extraParams = {},
}: {
  chips: Chip[];
  active: string;
  basePath: string;
  paramName?: string;
  extraParams?: Record<string, string | undefined>;
}) {
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {chips.map((chip) => {
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(extraParams)) {
          if (value) params.set(key, value);
        }
        if (chip.value) params.set(paramName, chip.value);
        const query = params.toString();

        return (
          <Link
            key={chip.value || "all"}
            href={query ? `${basePath}?${query}` : basePath}
            aria-current={active === chip.value ? "page" : undefined}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-xs transition-colors",
              active === chip.value
                ? "border-ink bg-ink text-white"
                : "border-line bg-paper text-[#444] hover:border-ink",
            )}
          >
            {chip.label}
            {chip.count !== undefined ? (
              <span className="ms-1.5 tabular-nums opacity-60">{chip.count}</span>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}
