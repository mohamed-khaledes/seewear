import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

export type Crumb = { label: string; href?: string };

type ContentHeroProps = {
  eyebrow: string;
  title: string;
  lede?: string;
  /**
   * Optional photograph. The help pages deliberately go without one — the store
   * has three campaign shots, and repeating them on every policy page would
   * cheapen all three.
   */
  image?: string;
  focus?: string;
  crumbs?: Crumb[];
};

/** The dark opening band shared by /about and every /help page. */
export function ContentHero({
  eyebrow,
  title,
  lede,
  image,
  focus = "50% 35%",
  crumbs,
}: ContentHeroProps) {
  return (
    <section className="relative overflow-hidden bg-ink text-white">
      {image ? (
        <>
          <Image
            src={image}
            alt=""
            fill
            priority
            sizes="100vw"
            style={{ objectPosition: focus }}
            className="object-cover"
          />
          <div
            className="absolute inset-0 bg-[linear-gradient(to_top,rgba(5,5,5,0.94)_0%,rgba(5,5,5,0.62)_48%,rgba(5,5,5,0.3)_100%)]"
            aria-hidden="true"
          />
        </>
      ) : null}

      <div
        className={cn(
          "relative mx-auto w-full max-w-5xl px-5 lg:px-6",
          image
            ? "pb-12 pt-24 sm:pt-32 lg:pb-16 lg:pt-40"
            : "pb-10 pt-12 lg:pb-14 lg:pt-16",
        )}
      >
        {crumbs?.length ? <Breadcrumbs crumbs={crumbs} /> : null}

        <p className="up-xs text-white/55">{eyebrow}</p>
        <h1 className="mt-3 max-w-[20ch] text-3xl font-bold leading-[1.05] tracking-tight sm:text-4xl lg:text-5xl">
          {title}
        </h1>
        {lede ? (
          <p className="mt-4 max-w-[58ch] text-sm leading-relaxed text-white/70 lg:text-base">
            {lede}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="up-xs flex flex-wrap items-center gap-x-2 gap-y-1 text-white/45">
        {crumbs.map((crumb, index) => (
          <li key={crumb.label} className="flex items-center gap-2">
            {index > 0 ? <span aria-hidden="true">/</span> : null}
            {crumb.href ? (
              <Link href={crumb.href} className="transition-colors hover:text-white">
                {crumb.label}
              </Link>
            ) : (
              <span className="text-white/75">{crumb.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
