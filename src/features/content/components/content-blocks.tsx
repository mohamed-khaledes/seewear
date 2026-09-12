import { cn } from "@/lib/utils";

/**
 * The typographic kit the content pages are built from. Everything here uses
 * the storefront's own tokens — paper cards on concrete, hairline rules,
 * uppercase tracked eyebrows — so a policy page reads as the same shop.
 */

/** A white card on the concrete page ground. */
export function ContentCard({
  id,
  eyebrow,
  title,
  children,
  className,
}: {
  id?: string;
  eyebrow?: string;
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        // scroll-mt keeps an #anchor clear of the sticky header; min-w-0 lets a
        // wide child scroll inside itself rather than stretch the card.
        "scroll-mt-24 min-w-0 bg-paper p-6 sm:p-8 lg:p-10",
        className,
      )}
    >
      {eyebrow ? <p className="up-xs text-grey-2">{eyebrow}</p> : null}
      {title ? (
        <h2 className="mt-2 text-xl font-bold tracking-tight sm:text-2xl">{title}</h2>
      ) : null}
      <div className={cn(eyebrow || title ? "mt-5" : undefined)}>{children}</div>
    </section>
  );
}

/** Body copy at a comfortable measure. */
export function Prose({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "max-w-[68ch] space-y-4 text-sm leading-relaxed text-grey-2 [&_a]:font-medium [&_a]:text-ink [&_a]:underline [&_a]:underline-offset-2 [&_strong]:font-semibold [&_strong]:text-ink",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Label/value rows separated by hairlines — used for rates and timings. */
export function FactList({
  items,
}: {
  items: { label: string; value: React.ReactNode; note?: string }[];
}) {
  return (
    <dl className="mt-1 divide-y divide-line border-y border-line">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3.5"
        >
          <dt className="text-sm font-medium text-ink">
            {item.label}
            {item.note ? (
              <span className="mt-0.5 block text-xs font-normal text-grey">
                {item.note}
              </span>
            ) : null}
          </dt>
          <dd className="text-sm font-semibold tabular-nums text-ink">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Numbered steps — how a return works, how to measure. */
export function Steps({ items }: { items: { title: string; body: string }[] }) {
  return (
    <ol className="grid gap-5">
      {items.map((item, index) => (
        <li key={item.title} className="flex gap-4">
          <span
            aria-hidden="true"
            className="up-xs mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-ink font-semibold text-white"
          >
            {index + 1}
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">{item.title}</p>
            <p className="mt-1 max-w-[60ch] text-sm leading-relaxed text-grey-2">
              {item.body}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** A quiet aside for the one thing people miss. */
export function Callout({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-6 border-l-2 border-ink bg-concrete p-4 sm:p-5">
      <p className="up-xs text-ink">{title}</p>
      <div className="mt-2 max-w-[60ch] text-sm leading-relaxed text-grey-2">
        {children}
      </div>
    </div>
  );
}

/** The concrete page body every content page shares. */
export function ContentBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="bg-concrete px-5 py-10 lg:px-6 lg:py-14">
      <div className={cn("mx-auto w-full max-w-5xl", className)}>{children}</div>
    </div>
  );
}
