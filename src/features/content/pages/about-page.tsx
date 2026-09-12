import Image from "next/image";
import Link from "next/link";

import { siteConfig } from "@/config/site";
import { ContentHero } from "@/features/content/components/content-hero";
import {
  ContentBody,
  ContentCard,
  FactList,
  Prose,
} from "@/features/content/components/content-blocks";

/**
 * The three footer links `/about#stores`, `#careers` and `#sustainability` land
 * on the sections below — the ids here are what make those links work, so do
 * not rename one without changing `config/site.ts`.
 */
export function AboutPage() {
  return (
    <>
      <ContentHero
        eyebrow="Since 2019"
        title="Clothes worth keeping."
        lede={siteConfig.tagline}
        image="/hero/hero-lineup.webp"
        focus="50% 28%"
        crumbs={[{ label: "Home", href: "/" }, { label: "About" }]}
      />

      <ContentBody className="grid gap-4">
        <ContentCard eyebrow="The idea" title="Fewer things, made properly">
          <Prose>
            <p>
              SEEWEAR started in a Cairo flat with one hoodie and a stubborn
              opinion: most menswear is either disposable or priced like a car. We
              wanted the third thing. Heavy cotton, honest seams, a cut that still
              looks right after two winters.
            </p>
            <p>
              We keep the range small on purpose. Twelve or so pieces at a time,
              each one carried until it stops earning its place. That is also why
              you will see the same garment come back in a new colour rather than a
              new silhouette every season.
            </p>
            <p>
              Everything ships from Cairo, in EGP, with the tax and delivery shown
              before you pay. No conversion surprises at the till.
            </p>
          </Prose>
        </ContentCard>

        <div className="grid gap-4 lg:grid-cols-[1.1fr_minmax(0,1fr)]">
          <ContentCard eyebrow="How we make it" title="The short supply chain">
            <Prose>
              <p>
                Cotton is knitted and dyed in Mahalla, then cut and sewn in a
                workshop in Shubra we have used since the first run. Two suppliers,
                both within a morning&apos;s drive, both audited in person rather
                than by certificate.
              </p>
              <p>
                Short chains are easier to answer for. When a seam fails we know
                which line it came off, and we can fix the next run instead of
                writing an apology.
              </p>
            </Prose>

            <div className="mt-6">
              <FactList
                items={[
                  { label: "Founded", value: "2019" },
                  { label: "Pieces in the range", value: "12" },
                  { label: "Suppliers", value: "2" },
                  { label: "Ships from", value: "Cairo" },
                ]}
              />
            </div>
          </ContentCard>

          <div className="relative min-h-70 overflow-hidden bg-ink lg:min-h-full">
            <Image
              src="/editorial/247.webp"
              alt="Model wearing the black Owners Club hoodie"
              fill
              sizes="(min-width: 1024px) 40vw, 100vw"
              className="object-cover"
              style={{ objectPosition: "56% 26%" }}
            />
          </div>
        </div>

        <ContentCard id="stores" eyebrow="Stores" title="Where to find us">
          <Prose>
            <p>
              One showroom, open by appointment, above the studio in Zamalek. You
              can try the full range on, and we will tell you honestly if the size
              you booked is the wrong one.
            </p>
            <p>
              Book by emailing <a href={`mailto:${siteConfig.support.email}`}>{siteConfig.support.email}</a>{" "}
              with a day that suits you.
            </p>
          </Prose>

          <div className="mt-6">
            <FactList
              items={[
                { label: "Zamalek showroom", note: "By appointment", value: "Sun–Thu, 11am–7pm" },
                { label: "Pop-ups", note: "Announced by email first", value: "Seasonal" },
                { label: "Phone", value: siteConfig.support.phone },
              ]}
            />
          </div>
        </ContentCard>

        <ContentCard id="careers" eyebrow="Careers" title="Working here">
          <Prose>
            <p>
              We are eleven people. That means whatever you are hired to do, you
              will also do a bit of everything else — pack orders in December, sit
              in on a fit session, argue about a hem.
            </p>
            <p>
              There is no open listing right now. We still read speculative
              applications, and we keep the good ones. Send what you have made and
              one paragraph on why this shop rather than another.
            </p>
            <p>
              <a href={`mailto:${siteConfig.support.email}`}>{siteConfig.support.email}</a>
            </p>
          </Prose>
        </ContentCard>

        <ContentCard
          id="sustainability"
          eyebrow="Sustainability"
          title="What we will and will not claim"
        >
          <Prose>
            <p>
              We are not a sustainable brand. We make clothes, and making clothes
              costs something. What we can say is narrower and checkable.
            </p>
            <p>
              Cotton is sourced within Egypt, so the fibre does not cross an ocean
              before it becomes a shirt. Orders ship in recycled cardboard with
              paper tape and no plastic filler. Offcuts from the cutting table go to
              a rag merchant in the same district rather than to landfill.
            </p>
            <p>
              The most useful thing either of us can do is make the garment last.
              That is what the <Link href="/help/size-guide">size guide</Link> is
              for — a piece that fits gets worn, and a piece that gets worn does not
              get replaced.
            </p>
          </Prose>
        </ContentCard>

        <div className="flex flex-wrap items-center justify-between gap-5 bg-ink p-6 text-white sm:p-8">
          <div>
            <h2 className="text-lg font-bold tracking-tight">See the current range</h2>
            <p className="mt-1 max-w-[46ch] text-sm leading-relaxed text-white/65">
              Twelve pieces, in stock, shipped from Cairo.
            </p>
          </div>
          <Link
            href="/products"
            className="up-sm shrink-0 border border-white/25 px-5 py-3 font-semibold transition-colors hover:border-white hover:bg-white hover:text-ink"
          >
            Shop everything
          </Link>
        </div>
      </ContentBody>
    </>
  );
}
