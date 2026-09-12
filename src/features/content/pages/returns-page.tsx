import Link from "next/link";

import { siteConfig } from "@/config/site";
import { formatMoney } from "@/lib/utils";
import { SHIPPING_FLAT_CENTS } from "@/config/constants";
import { ContentHero } from "@/features/content/components/content-hero";
import {
  Callout,
  ContentBody,
  ContentCard,
  FactList,
  Prose,
  Steps,
} from "@/features/content/components/content-blocks";
import { HelpShell } from "@/features/content/components/help-shell";

export function ReturnsPage() {
  return (
    <>
      <ContentHero
        eyebrow="Help"
        title="Returns and exchanges"
        lede="Fourteen days to decide, unworn and with the tags on. No restocking fee, no argument."
        crumbs={[{ label: "Home", href: "/" }, { label: "Help", href: "/help" }, { label: "Returns" }]}
      />

      <ContentBody>
        <HelpShell>
          <ContentCard eyebrow="The short version" title="What you get">
            <FactList
              items={[
                { label: "Return window", note: "From the day it is delivered", value: "14 days" },
                { label: "Exchange window", note: "Size swaps, same garment", value: "30 days" },
                { label: "Refund method", note: "Back to the card that paid", value: "Original card" },
                {
                  label: "Return shipping",
                  note: "Deducted from the refund unless the fault is ours",
                  value: formatMoney(SHIPPING_FLAT_CENTS),
                },
                { label: "Refund lands in", note: "After we receive and check the parcel", value: "5–10 days" },
              ]}
            />
          </ContentCard>

          <ContentCard eyebrow="Process" title="How to send something back">
            <Steps
              items={[
                {
                  title: "Find the order",
                  body: "Open your order history and pick the order. Guests can use the order number from the confirmation email.",
                },
                {
                  title: "Email us what and why",
                  body: `Send the order number and the items to ${siteConfig.support.email}. One line on the reason is enough — it is what tells us whether the fit or the make needs fixing.`,
                },
                {
                  title: "We send a label",
                  body: "You get a prepaid return label within one working day, plus the pickup window for your governorate.",
                },
                {
                  title: "Pack it as it came",
                  body: "Tags attached, original packaging where you still have it. Fold it — do not force it into something smaller.",
                },
                {
                  title: "Refund on arrival",
                  body: "We check the item the day it reaches us and refund to the original card. Your bank decides the last few days of that journey.",
                },
              ]}
            />

            <Callout title="Faulty or wrong item">
              If we sent the wrong thing, or a seam gave way in normal wear, return
              shipping is on us and the refund is whole. Send a photograph with the
              first email and we will skip the back-and-forth.
            </Callout>
          </ContentCard>

          <ContentCard eyebrow="Exceptions" title="What we cannot take back">
            <Prose>
              <p>
                Three things, and only three: anything worn, washed or altered;
                anything with the tags removed; and headwear or other accessories once
                the hygiene seal is broken.
              </p>
              <p>
                Sale items are returnable on exactly the same terms as everything else.
                A discount does not make a garment final.
              </p>
              <p>
                Still not sure what applies? The{" "}
                <Link href="/help/size-guide">size guide</Link> heads off most of it, and{" "}
                <Link href="/help/contact">a message to us</Link> handles the rest.
              </p>
            </Prose>
          </ContentCard>
        </HelpShell>
      </ContentBody>
    </>
  );
}
