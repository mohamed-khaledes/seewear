import Image from "next/image";
import Link from "next/link";

import type { MessageKey, Translator } from "@/lib/i18n";

type Block = {
  eyebrow: MessageKey;
  title: MessageKey;
  cta: MessageKey;
  href: string;
  image: string;
  alt: string;
  /** Where the model sits in the frame, so the mobile crop keeps him in shot. */
  focus: string;
};

const BLOCKS: Block[] = [
  {
    eyebrow: "home.editorial1Eyebrow",
    title: "home.editorial1Title",
    cta: "home.editorial1Cta",
    href: "/products?category=247",
    image: "/editorial/247.webp",
    alt: "Model wearing the black Owners Club hoodie and a ribbed beanie",
    focus: "56% 26%",
  },
  {
    eyebrow: "home.editorial2Eyebrow",
    title: "home.editorial2Title",
    cta: "home.editorial2Cta",
    href: "/products?category=outerwear",
    image: "/editorial/outerwear.webp",
    alt: "Model wearing the blue check flannel overshirt",
    focus: "66% 42%",
  },
];

/**
 * The two blocks meet edge to edge. Nothing here may carry a light border or
 * background: `--line` and `--concrete` are both near-white, so a hairline
 * between two black photographs reads as a seam. The container is `bg-ink` so
 * that subpixel rounding in the two-column grid has nothing pale to leak.
 */
export function Editorial({ t }: { t: Translator }) {
  return (
    <div className="grid bg-ink lg:grid-cols-2">
      {BLOCKS.map((block) => (
        <article
          key={block.href}
          className="group relative flex aspect-4/5 flex-col justify-end overflow-hidden bg-ink p-6 text-white sm:aspect-3/2 sm:p-8 lg:aspect-[1.6/1]"
        >
          <Image
            src={block.image}
            alt={block.alt}
            fill
            sizes="(min-width: 1024px) 50vw, 100vw"
            style={{ objectPosition: block.focus }}
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
          />

          <div
            className="absolute inset-0 bg-[linear-gradient(to_top,rgba(5,5,5,0.92)_0%,rgba(5,5,5,0.55)_38%,rgba(5,5,5,0.08)_72%)] lg:bg-[linear-gradient(100deg,rgba(5,5,5,0.9)_0%,rgba(5,5,5,0.62)_38%,rgba(5,5,5,0.15)_70%,rgba(5,5,5,0.05)_100%)]"
            aria-hidden="true"
          />

          <p className="up-xs relative opacity-75">{t(block.eyebrow)}</p>
          <h2 className="relative mb-4 mt-2 max-w-[15ch] text-2xl font-bold leading-tight sm:text-[26px]">
            {t(block.title)}
          </h2>
          <Link
            href={block.href}
            className="up-sm relative self-start border-b border-white/50 pb-1 font-medium transition-colors hover:border-white"
          >
            {t(block.cta)} <span className="rtl:hidden">→</span>
            <span className="hidden rtl:inline">←</span>
          </Link>
        </article>
      ))}
    </div>
  );
}
