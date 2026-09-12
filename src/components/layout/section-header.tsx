import Link from "next/link";

import { cn } from "@/lib/utils";

/** The "The Owners Club — View All →" strip from the prototype. */
export function SectionHeader({
  title,
  href,
  linkLabel = "View all",
  className,
}: {
  title: string;
  href?: string;
  linkLabel?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-4 px-5 pb-4.5 pt-8 lg:px-6",
        className,
      )}
    >
      <h2 className="up-sm text-[15px] font-bold">{title}</h2>
      {href ? (
        <Link
          href={href}
          className="up-sm shrink-0 border-b border-line pb-0.5 text-grey-2 transition-colors hover:text-ink"
        >
          {linkLabel} →
        </Link>
      ) : null}
    </div>
  );
}
