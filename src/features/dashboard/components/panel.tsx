import Link from "next/link";

import { cn } from "@/lib/utils";

export function Panel({
  title,
  note,
  href,
  children,
  className,
  bodyClassName,
}: {
  title: string;
  note?: string;
  href?: string;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border border-line bg-paper",
        className,
      )}
    >
      <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <h2 className="text-sm font-bold">{title}</h2>
        {href ? (
          <Link
            href={href}
            className="text-[11px] text-grey-2 transition-colors hover:text-ink"
          >
            View all →
          </Link>
        ) : note ? (
          <span className="text-[11px] text-grey-2">{note}</span>
        ) : null}
      </header>
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

export function EmptyPanelState({
  title,
  body,
  icon,
}: {
  title: string;
  body: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-line bg-paper px-6 py-16 text-center">
      {icon ? (
        <div className="mx-auto mb-3.5 w-fit text-grey [&_svg]:size-9 [&_svg]:stroke-[1.3]">
          {icon}
        </div>
      ) : null}
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mx-auto mt-1.5 max-w-sm text-sm text-grey-2">{body}</p>
    </div>
  );
}
