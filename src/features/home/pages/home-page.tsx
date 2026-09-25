import Link from "next/link";

import { JsonLd } from "@/components/common/json-ld";
import { Marquee } from "@/components/layout/marquee";
import { SectionHeader } from "@/components/layout/section-header";
import { marqueeItems, siteConfig } from "@/config/site";
import { Editorial } from "@/features/home/components/editorial";
import { Hero } from "@/features/home/components/hero";
import { ProductGrid } from "@/features/products";
import { getFeaturedProducts } from "@/features/products/server";
import { getT } from "@/lib/i18n/server";
import type { Translator } from "@/lib/i18n";

export async function HomePage() {
  const [featured, t] = await Promise.all([getFeaturedProducts(10), getT()]);

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "OnlineStore",
          name: siteConfig.name,
          url: siteConfig.url,
          description: siteConfig.description,
          email: siteConfig.support.email,
          areaServed: { "@type": "Country", name: "Egypt" },
          currenciesAccepted: "EGP",
        }}
      />
      <Hero t={t} />
      <Marquee items={marqueeItems} t={t} />

      <SectionHeader
        title={t("home.featured")}
        href="/products"
        linkLabel={t("listing.seeEverything")}
      />

      {featured.length > 0 ? (
        <ProductGrid products={featured} priorityCount={5} />
      ) : (
        <EmptyCatalog t={t} />
      )}

      <Editorial t={t} />
    </>
  );
}

function EmptyCatalog({ t }: { t: Translator }) {
  return (
    <div className="border-y border-line bg-paper px-6 py-20 text-center">
      <h3 className="text-base font-semibold">{t("home.emptyTitle")}</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm text-grey-2">
        {t("home.emptyBody")} Add them from the dashboard, or run{" "}
        <code className="rounded bg-concrete px-1.5 py-0.5 font-mono text-xs">
          npm run db:seed
        </code>{" "}
        to load the sample catalogue.
      </p>
      <Link
        href="/dashboard/products"
        className="up-sm mt-5 inline-block border-b border-line pb-0.5 font-semibold text-grey-2 transition-colors hover:text-ink"
      >
        {t("home.emptyCta")}
      </Link>
    </div>
  );
}
