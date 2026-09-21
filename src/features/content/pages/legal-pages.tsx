import Link from "next/link";

import { legalPages, siteConfig } from "@/config/site";
import { getStoreSettings, getPricingRules } from "@/lib/store-settings";
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
 * The three policies a customer agrees to at checkout.
 *
 * Written against what this codebase actually does — which processors see
 * which data, what sits in a cookie, what the stock hold and the expiry job
 * mean for an order — so the policy cannot promise something the software does
 * not do. The business's legal identity comes from Settings, the same fields
 * the footer and the invoices print.
 */

const UPDATED = "18 September 2026";

async function whoWeAre() {
  const settings = await getStoreSettings();
  const name = settings.legal_name || settings.store_name || siteConfig.name;
  const details = [
    settings.commercial_register ? `Commercial register ${settings.commercial_register}` : null,
    settings.tax_registration ? `Tax registration ${settings.tax_registration}` : null,
    settings.registered_address,
  ].filter(Boolean);
  return { name, details, email: settings.support_email || siteConfig.support.email };
}

function LegalLayout({
  title,
  lede,
  crumb,
  children,
}: {
  title: string;
  lede: string;
  crumb: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <ContentHero
        eyebrow="Legal"
        title={title}
        lede={lede}
        crumbs={[{ label: "Home", href: "/" }, { label: crumb }]}
      />
      <ContentBody>
        <HelpShell topics={legalPages} heading="Legal">
          {children}
          <p className="up-xs text-grey">Last updated {UPDATED}</p>
        </HelpShell>
      </ContentBody>
    </>
  );
}

/* ================================================================ privacy */

export async function PrivacyPage() {
  const us = await whoWeAre();

  return (
    <LegalLayout
      crumb="Privacy"
      title="Privacy policy"
      lede="What we keep about you, why we keep it, who else sees it, and how to have it removed."
    >
      <ContentCard eyebrow="Who we are" title="The business behind this store">
        <Prose>
          <p>
            {us.name} runs {siteConfig.name} and decides how the personal data described
            here is used.{us.details.length ? ` ${us.details.join(" · ")}.` : ""} Questions
            about your data go to <a href={`mailto:${us.email}`}>{us.email}</a>.
          </p>
          <p>
            We handle personal data in line with Egypt&apos;s Personal Data Protection Law
            (Law No. 151 of 2020).
          </p>
        </Prose>
      </ContentCard>

      <ContentCard eyebrow="What we collect" title="Only what an order needs">
        <FactList
          items={[
            {
              label: "Contact",
              note: "To send the receipt and tell you where the order is",
              value: "Email",
            },
            {
              label: "Delivery",
              note: "Name, phone, street, city and governorate — printed on the parcel",
              value: "Address",
            },
            {
              label: "The order",
              note: "What you bought, what it cost, and each status change with its date",
              value: "History",
            },
            {
              label: "An account, if you make one",
              note: "Name, phone, saved addresses, wishlist and bag",
              value: "Optional",
            },
            {
              label: "Payment",
              note: "Card numbers go straight to Paymob. We only ever see the last four digits",
              value: "Never stored",
            },
            {
              label: "Reviews",
              note: "The rating and words you choose to publish, with your first name",
              value: "Public",
            },
          ]}
        />
      </ContentCard>

      <ContentCard eyebrow="Who else sees it" title="The companies that run parts of the shop">
        <Prose>
          <p>We do not sell your data or share it for advertising. These processors handle it on our behalf, each only for its job:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li><strong>Supabase</strong> — the database and sign-in system where orders and accounts live.</li>
            <li><strong>Vercel</strong> — hosts the website and counts page visits without cookies.</li>
            <li><strong>Paymob</strong> — takes card and wallet payments. Its own privacy policy covers the card details you give it.</li>
            <li><strong>Resend</strong> — delivers our order emails.</li>
            <li><strong>Google</strong> — only if you choose &ldquo;Continue with Google&rdquo; to sign in.</li>
            <li><strong>The courier</strong> — your name, phone and address, to deliver the parcel.</li>
          </ul>
          <p>Some of these store data outside Egypt. We use them because they protect it to a standard at least equal to our own.</p>
        </Prose>
      </ContentCard>

      <ContentCard eyebrow="How long" title="What we keep, and for how long">
        <Prose>
          <p>
            <strong>Orders</strong> are kept as long as Egyptian tax law requires us to keep
            sales records, because each one is also a tax invoice. <strong>Accounts</strong>{" "}
            are kept until you ask us to close them. <strong>Checkouts you never pay for</strong>{" "}
            are cancelled after an hour and kept only as a record that they happened.
          </p>
        </Prose>
      </ContentCard>

      <ContentCard eyebrow="Your rights" title="Seeing, correcting and deleting your data">
        <Prose>
          <p>
            You can correct your name, phone and addresses yourself in{" "}
            <Link href="/account">your account</Link>. To get a copy of everything we hold
            about you, or to have your account deleted, email{" "}
            <a href={`mailto:${us.email}`}>{us.email}</a> from the address on the account.
            We answer within thirty days.
          </p>
          <p>
            Deleting an account removes your profile, addresses, wishlist and bag. Past
            orders stay, detached from you, for the tax reason above.
          </p>
        </Prose>
      </ContentCard>
    </LegalLayout>
  );
}

/* ================================================================ terms */

export async function TermsPage() {
  const [us, rules] = await Promise.all([whoWeAre(), getPricingRules()]);

  return (
    <LegalLayout
      crumb="Terms of sale"
      title="Terms of sale"
      lede="The agreement between you and us every time you place an order."
    >
      <ContentCard eyebrow="Who you are buying from">
        <Prose>
          <p>
            You are buying from {us.name}.{us.details.length ? ` ${us.details.join(" · ")}.` : ""}{" "}
            These terms, with our <Link href="/help/returns">returns policy</Link> and{" "}
            <Link href="/legal/privacy">privacy policy</Link>, are the whole agreement. Egyptian
            law governs them, including the Consumer Protection Law (Law No. 181 of 2018),
            and nothing here takes away a right that law gives you.
          </p>
        </Prose>
      </ContentCard>

      <ContentCard eyebrow="1" title="When an order is accepted">
        <Prose>
          <p>
            Placing an order reserves the pieces for you straight away. A card order is
            accepted once Paymob confirms the payment to us; if payment is not completed
            within an hour, the reservation ends and the pieces go back on sale. A cash on
            delivery order is accepted as soon as you place it.
          </p>
          <p>
            If we cannot fulfil an accepted order — a piece turns out damaged, or a stock
            count was wrong — we tell you and refund anything paid in full.
          </p>
        </Prose>
      </ContentCard>

      <ContentCard eyebrow="2" title="Prices and what you pay">
        <Prose>
          <p>
            Prices are in Egyptian pounds and include nothing hidden. At checkout we add
            shipping for your governorate and VAT at{" "}
            {Number((rules.taxRate * 100).toFixed(2))}%, and show the full total before you
            pay. Shipping is free on orders of {formatMoney(rules.freeShippingThresholdCents)}{" "}
            or more before any discount.
          </p>
          <p>
            A discount code applies only if it is valid when you place the order. We check
            every price again at that moment; if something changed while you were deciding,
            checkout stops and shows you the new total before anything is charged.
          </p>
        </Prose>
      </ContentCard>

      <ContentCard eyebrow="3" title="Paying">
        <Prose>
          <p>
            Card and mobile wallet payments are handled by Paymob; we never see your full
            card number.{" "}
            {rules.codEnabled
              ? "With cash on delivery you pay the courier the order total in cash when the parcel arrives. Refusing a cash parcel at the door cancels the order."
              : ""}
          </p>
        </Prose>
      </ContentCard>

      <ContentCard eyebrow="4" title="Delivery">
        <Prose>
          <p>
            We deliver across Egypt, usually within two to four working days of the order
            being accepted. Delivery times are estimates rather than promises; the{" "}
            <Link href="/help/shipping">shipping page</Link> has the detail by governorate,
            and <Link href="/track">order tracking</Link> shows where yours is.
          </p>
        </Prose>
      </ContentCard>

      <ContentCard eyebrow="5" title="Returns and refunds">
        <Prose>
          <p>
            You have fourteen days from delivery to return unworn pieces with their tags on,
            as the <Link href="/help/returns">returns policy</Link> sets out. Card refunds go
            back to the card that paid; cash refunds are arranged with you directly. A piece
            that arrives faulty is ours to put right at no cost to you.
          </p>
        </Prose>
      </ContentCard>

      <Callout title="Questions about an order">
        Email <a href={`mailto:${us.email}`}>{us.email}</a> with the order number. A person
        answers within one working day.
      </Callout>
    </LegalLayout>
  );
}

/* ================================================================ cookies */

export async function CookiesPage() {
  const us = await whoWeAre();

  return (
    <LegalLayout
      crumb="Cookies"
      title="Cookies"
      lede="We set very few, all of them needed for the shop to work. None track you across other sites."
    >
      <ContentCard eyebrow="What we set" title="Cookies and browser storage">
        <FactList
          items={[
            {
              label: "Sign-in session",
              note: "Set by Supabase when you sign in, so you stay signed in between pages",
              value: "Necessary",
            },
            {
              label: "Your bag",
              note: "Kept in your browser's storage so it survives a closed tab. Never sent anywhere until checkout",
              value: "Necessary",
            },
            {
              label: "3D viewer preference",
              note: "Remembers whether you turned the 3D product view on",
              value: "Preference",
            },
            {
              label: "Visit counts",
              note: "Vercel Analytics counts page views without setting any cookie or identifying you",
              value: "No cookie",
            },
          ]}
        />
      </ContentCard>

      <ContentCard eyebrow="Your choice" title="Turning them off">
        <Prose>
          <p>
            Because everything here is either necessary or does not use a cookie at all,
            there is nothing to accept or reject when you arrive. You can still clear or
            block cookies in your browser; the shop works without them, except that you will
            not stay signed in and your bag will not be remembered.
          </p>
          <p>
            If we ever add a cookie that is not strictly needed, it will not be set until
            you agree, and this page will say so first. Questions:{" "}
            <a href={`mailto:${us.email}`}>{us.email}</a>.
          </p>
        </Prose>
      </ContentCard>
    </LegalLayout>
  );
}
