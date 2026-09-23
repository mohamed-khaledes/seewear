import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function Hero() {
  return (
    <section className="relative grid place-items-center overflow-hidden bg-ink text-white min-h-[calc(100dvh-150px)]">
      <Image
        src="/hero/hero-lineup.webp"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-[50%_30%]"
      />

      {/* Scrim. The lineup sits mid-frame, so the copy needs cover above and
          below it without flattening the models out of the picture. */}
      <div
        className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(5,5,5,0.55)_0%,rgba(5,5,5,0.15)_38%,rgba(5,5,5,0.55)_78%,rgba(5,5,5,0.88)_100%)]"
        aria-hidden="true"
      />

      <div className="relative px-5 pb-12 pt-24 text-center sm:pb-16 sm:pt-32">
        <p className="mb-3.5 text-[10px] uppercase tracking-[0.34em] opacity-80">
          Now live
        </p>
        <h1 className="text-[clamp(30px,5.4vw,62px)] font-bold leading-[0.98] tracking-[0.02em] drop-shadow-[0_2px_24px_rgba(0,0,0,0.6)]">
          BLACK FRIDAY SALE
        </h1>
        <Link
          href="/products?sale=1"
          className="up-sm mt-6 inline-flex items-center gap-3 border border-white/60 bg-black/20 px-6 py-3.5 font-semibold backdrop-blur-[2px] transition-colors hover:border-white hover:bg-white hover:text-ink"
        >
          Enter the sale
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </section>
  );
}
