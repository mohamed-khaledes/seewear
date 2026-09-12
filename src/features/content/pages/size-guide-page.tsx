import Link from "next/link";

import { ContentHero } from "@/features/content/components/content-hero";
import {
  Callout,
  ContentBody,
  ContentCard,
  Prose,
  Steps,
} from "@/features/content/components/content-blocks";
import { HelpShell } from "@/features/content/components/help-shell";
import { SizeTables } from "@/features/content/components/size-tables";

export function SizeGuidePage() {
  return (
    <>
      <ContentHero
        eyebrow="Help"
        title="Size guide"
        lede="Every measurement is the garment laid flat, not your body. Compare it against something you already own and the guesswork goes away."
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Help", href: "/help" },
          { label: "Size Guide" },
        ]}
      />

      <ContentBody>
        <HelpShell>
          <ContentCard>
            <SizeTables />
          </ContentCard>

          <ContentCard eyebrow="Method" title="How to measure">
            <Prose className="mb-6">
              <p>
                The most reliable way to size a garment you cannot try on is to
                measure one you already like, then match the numbers above. Lay it
                flat, smooth it out, and do not pull the tape tight.
              </p>
            </Prose>

            <Steps
              items={[
                {
                  title: "Chest",
                  body: "Measure straight across the garment from armpit to armpit. That is the half-chest, which is what the table lists.",
                },
                {
                  title: "Body length",
                  body: "From the highest point of the shoulder seam straight down to the hem, keeping the tape parallel to the front edge.",
                },
                {
                  title: "Shoulder",
                  body: "Seam to seam across the back. On a drop-shoulder cut this sits well down the arm, which is the look.",
                },
                {
                  title: "Waist and hip",
                  body: "Flat across the front and doubled. Take an elasticated waist as it lies, relaxed rather than stretched out.",
                },
                {
                  title: "Inseam",
                  body: "From the crotch seam down the inside of the leg to the hem.",
                },
              ]}
            />

            <Callout title="Between two sizes?">
              Our tops are cut boxy. Take the smaller size for a close fit, the larger
              for the oversized look the collection is drawn around. Outerwear is
              already measured to layer, so stay on your usual size unless you are
              wearing it over a jacket.
            </Callout>
          </ContentCard>

          <ContentCard eyebrow="Accessories" title="Caps and beanies">
            <Prose>
              <p>
                Accessories are one size. The cap runs 55–61cm on an adjustable strap,
                and the beanie is a rib knit that sits comfortably over the same range.
              </p>
              <p>
                If the fit is still wrong when it arrives, that is what the{" "}
                <Link href="/help/returns">returns policy</Link> is for. Size swaps
                have a thirty-day window rather than fourteen.
              </p>
            </Prose>
          </ContentCard>
        </HelpShell>
      </ContentBody>
    </>
  );
}
