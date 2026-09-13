import Link from "next/link";
import { ArrowRight, PackageSearch } from "lucide-react";

import { helpTopics, siteConfig } from "@/config/site";
import { ContentHero } from "@/features/content/components/content-hero";
import { ContentBody } from "@/features/content/components/content-blocks";

export function HelpIndexPage() {
  return (
    <>
      <ContentHero
        eyebrow="Customer care"
        title="Help"
        lede="Shipping, returns, fit and everything else. If the answer is not here, write to us and a person will reply."
        crumbs={[{ label: "Home", href: "/" }, { label: "Help" }]}
      />

      <ContentBody>
        <ul className="grid gap-4 sm:grid-cols-2">
          {helpTopics.map((topic) => (
            <li key={topic.href}>
              <Link
                href={topic.href}
                className="group flex h-full flex-col justify-between gap-6 border border-line bg-paper p-6 transition-colors hover:border-ink sm:p-7"
              >
                <div>
                  <h2 className="text-lg font-bold tracking-tight">{topic.label}</h2>
                  <p className="mt-2 max-w-[36ch] text-sm leading-relaxed text-grey-2">
                    {topic.blurb}
                  </p>
                </div>
                <span className="up-sm flex items-center gap-2 text-grey-2 transition-colors group-hover:text-ink">
                  Read
                  <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-5 bg-ink p-6 text-white sm:p-8">
          <div className="flex items-start gap-4">
            <PackageSearch className="mt-0.5 size-5 shrink-0" strokeWidth={1.5} />
            <div>
              <h2 className="text-lg font-bold tracking-tight">
                Looking for a specific order?
              </h2>
              <p className="mt-1 max-w-[46ch] text-sm leading-relaxed text-white/65">
                Your order number and the email you checked out with are enough.
                No account needed — and everything you have ordered is in your
                account too.
              </p>
            </div>
          </div>

          <Link
            href="/track"
            className="up-sm shrink-0 border border-white/25 px-5 py-3 font-semibold transition-colors hover:border-white hover:bg-white hover:text-ink"
          >
            Track an order
          </Link>
        </div>

        <p className="mt-6 text-center text-xs text-grey">
          Prefer to write? {siteConfig.support.email}
        </p>
      </ContentBody>
    </>
  );
}
