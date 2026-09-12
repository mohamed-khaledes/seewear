import Link from "next/link";

import {
  FREE_SHIPPING_THRESHOLD_CENTS,
  SHIPPING_FLAT_CENTS,
  TAX_RATE,
} from "@/config/constants";
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
 * Every figure on this page is read from the same constants the checkout uses
 * to charge, so the policy text cannot drift away from the till. Change the
 * rate in `config/constants.ts` and this page changes with it.
 */
export function ShippingPage() {
  return (
    <>
      <ContentHero
        eyebrow="Help"
        title="Shipping"
        lede="Flat-rate express across Egypt, free once your order clears the threshold. Here is exactly what you pay and when it lands."
        crumbs={[{ label: "Home", href: "/" }, { label: "Help", href: "/help" }, { label: "Shipping" }]}
      />

      <ContentBody>
        <HelpShell>
          <ContentCard eyebrow="Rates" title="What shipping costs">
            <FactList
              items={[
                {
                  label: "Express delivery",
                  note: "Flat rate, anywhere in Egypt",
                  value: formatMoney(SHIPPING_FLAT_CENTS),
                },
                {
                  label: `Orders over ${formatMoney(FREE_SHIPPING_THRESHOLD_CENTS)}`,
                  note: "Measured on the subtotal, before any discount",
                  value: "Free",
                },
                {
                  label: "VAT",
                  note: "Charged on the subtotal after any discount",
                  value: `${Math.round(TAX_RATE * 100)}%`,
                },
              ]}
            />

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
                You will get a confirmation email the moment payment clears, and a
                second one with a tracking reference when the parcel leaves us. Both
                are also on your{" "}
                <Link href="/account/orders">order history</Link>.
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
