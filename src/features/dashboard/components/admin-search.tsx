"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";

/** Submits into the URL, so the search survives a refresh and can be shared. */
export function AdminSearch({
  basePath,
  placeholder,
  defaultValue = "",
  extraParams = {},
}: {
  basePath: string;
  placeholder: string;
  defaultValue?: string;
  extraParams?: Record<string, string | undefined>;
}) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);

  function submit(event: React.FormEvent) {
    event.preventDefault();

    const params = new URLSearchParams();
    for (const [key, param] of Object.entries(extraParams)) {
      if (param) params.set(key, param);
    }
    if (value.trim()) params.set("q", value.trim());

    const query = params.toString();
    router.push(query ? `${basePath}?${query}` : basePath);
  }

  return (
    <form onSubmit={submit} className="relative">
      <Search className="pointer-events-none absolute start-3 top-1/2 size-3.5 -translate-y-1/2 text-grey" />
      <input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-10 w-full rounded-lg border border-line bg-concrete py-2 ps-9 pe-3 text-xs outline-none transition-colors focus-visible:border-ink sm:w-56"
      />
    </form>
  );
}
