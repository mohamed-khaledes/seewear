"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { helpTopics, siteConfig, type NavLink } from "@/config/site";
import { cn } from "@/lib/utils";

/**
 * Two-column help chrome: topic list beside the article. Client-side only for
 * `usePathname` — it is what marks the current topic, and doing it here keeps
 * every help page itself a server component.
 */
export function HelpShell({
  children,
  topics = helpTopics,
  heading = "Help",
}: {
  children: React.ReactNode;
  /** The legal pages reuse this chrome with their own list. */
  topics?: NavLink[];
  heading?: string;
}) {
  const pathname = usePathname();

  return (
    <div className="grid gap-8 lg:grid-cols-[210px_minmax(0,1fr)] lg:gap-10">
      <nav aria-label={`${heading} topics`} className="lg:sticky lg:top-24 lg:self-start">
        <p className="up-xs mb-3 text-grey-2">{heading}</p>

        <ul className="flex flex-wrap gap-x-2 gap-y-2 lg:block lg:space-y-0.5">
          {topics.map((topic) => {
            const current = pathname === topic.href;
            return (
              <li key={topic.href}>
                <Link
                  href={topic.href}
                  aria-current={current ? "page" : undefined}
                  className={cn(
                    "up-sm block border px-3 py-2 transition-colors lg:border-0 lg:border-s-2 lg:px-3 lg:py-1.5",
                    current
                      ? "border-ink bg-ink text-white lg:bg-transparent lg:text-ink"
                      : "border-line bg-paper text-grey-2 hover:text-ink lg:border-line lg:bg-transparent",
                  )}
                >
                  {topic.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-6 hidden border-t border-line pt-5 lg:block">
          <p className="up-xs text-grey-2">Still stuck?</p>
          <a
            href={`mailto:${siteConfig.support.email}`}
            className="mt-1.5 block break-all text-sm font-medium text-ink underline underline-offset-2"
          >
            {siteConfig.support.email}
          </a>
        </div>
      </nav>

      {/* min-w-0: a grid item defaults to min-width:auto, so a wide child (the
          size tables) would push the column past the viewport instead of
          scrolling inside its own container. */}
      <div className="grid min-w-0 gap-6">{children}</div>
    </div>
  );
}
