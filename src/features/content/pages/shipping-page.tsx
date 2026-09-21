import Link from "next/link";

import { formatTaxRate, hasRegionalRates } from "@/lib/pricing";
import { getPricingRules } from "@/lib/store-settings";
import { formatMoney } from "@/lib/utils";
import { ContentHero } from "@/features/content/components/content-hero";
import {
  Callout,
  ContentBody,
  ContentCard,
  FactList,
  Prose,
} from "@/features/content/components/content-blocks";
import { HelpShell } from "@/features/content/components/help-shell";

/**
 * Every figure on this page is read from the same pricing rules checkout
 * charges from — the dashboard's Settings page — so the policy text cannot
 * drift away from the till.
 */
export async function ShippingPage() {
  const rules = await getPricingRules();
  const regional = Object.entries(rules.governorateRates).sort(([a], [b]) => a.localeCompare(b));

  return (
    <>
      <ContentHero
        eyebrow="Help"
        title="Shipping"
        lede="Express across Egypt, free once your order clears the threshold. Here is exactly what you pay and when it lands."
        crumbs={[{ label: "Home", href: "/" }, { label: "Help", href: "/help" }, { label: "Shipping" }]}
      />

      <ContentBody>
        <HelpShell>
          <ContentCard eyebrow="Rates" title="What shipping costs">
            <FactList
              items={[
                {
                  label: "Express delivery",
                  note: hasRegionalRates(rules)
                    ? "Most of Egypt — see the governorates below that differ"
                    : "Flat rate, anywhere in Egypt",
                  value: formatMoney(rules.shippingFlatCents),
                },
                {
                  label: `Orders over ${formatMoney(rules.freeShippingThresholdCents)}`,
                  note: "Measured on the subtotal, before any discount — everywhere",
                  value: "Free",
                },
                {
                  label: "VAT",
                  note: "Charged on the subtotal after any discount",
                  value: formatTaxRate(rules),
                },
              ]}
            />

            {regional.length > 0 ? (
              <div className="mt-6">
                <p className="up-xs mb-2 text-grey-2">Governorates with their own rate</p>
                <FactList
                  items={regional.map(([governorate, cents]) => ({
                    label: governorate,
                    value: formatMoney(cents),
                  }))}
                />
              </div>
            ) : null}

            {/* Both claims below are what `computeTotals` actually does: shipping
                is decided on the pre-discount subtotal, VAT on the post-discount
                one. Change that function and change this copy with it. */}
            <Callout title="How a discount code affects this">
              The free-shipping threshold is measured on your subtotal{" "}
              <strong>before</strong> the code comes off, so a discount never costs
              you free delivery. VAT is charged on what is left{" "}
              <strong>after</strong> it. Your bag shows how much further you have to
              go.
            </Callout>
          </ContentCard>

          <ContentCard eyebrow="Timing" title="When it arrives">
            <FactList
              items={[
                { label: "Cairo and Giza", value: "1–2 working days" },
                { label: "Alexandria and the Delta", value: "2–3 working days" },
                { label: "Upper Egypt and Sinai", value: "3–5 working days" },
                { label: "Red Sea and the New Valley", value: "4–6 working days" },
              ]}
            />

            <Prose className="mt-6">
              <p>
                Orders placed before 2pm are picked the same working day. Anything
                after that, or on a Friday or public holiday, starts its clock the
                next working morning.
              </p>
              <p>
                You will get a confirmation email the moment payment clears — or
                straight away for cash on delivery — and a second one with a tracking
                reference when the parcel leaves us. You can follow it any time on{" "}
                <Link href="/track">order tracking</Link>.
              </p>
            </Prose>
          </ContentCard>

          <ContentCard eyebrow="Coverage" title="Where we ship">
            <Prose>
              <p>
                We ship to all 27 governorates. Delivery is to a street address or a
                workplace, not to a PO box, and someone needs to be there to take the
                parcel.
              </p>
              <p>
                International orders are not open yet. If you are outside Egypt and
                want to be told when that changes, email us at the address in the
                sidebar and we will keep the note.
              </p>
            </Prose>
          </ContentCard>
        </HelpShell>
      </ContentBody>
    </>
  );
}
