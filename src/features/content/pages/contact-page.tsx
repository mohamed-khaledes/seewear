import { Clock, Mail, Phone } from "lucide-react";

import { siteConfig } from "@/config/site";
import { getSessionUser } from "@/features/auth/server";
import { ContentHero } from "@/features/content/components/content-hero";
import {
  ContentBody,
  ContentCard,
} from "@/features/content/components/content-blocks";
import { ContactForm } from "@/features/content/components/contact-form";
import { HelpShell } from "@/features/content/components/help-shell";

export async function ContactPage() {
  // Signed in? Then we already know who is writing — do not make them retype it.
  const user = await getSessionUser();

  return (
    <>
      <ContentHero
        eyebrow="Help"
        title="Talk to us"
        lede="One inbox, read by the people who pack the orders. We answer within one working day."
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Help", href: "/help" },
          { label: "Contact" },
        ]}
      />

      <ContentBody>
        <HelpShell>
          <ContentCard eyebrow="Message" title="Send us the details">
            <ContactForm
              defaultEmail={user?.email ?? ""}
              defaultName={user?.fullName ?? ""}
            />
          </ContentCard>

          <ContentCard eyebrow="Direct" title="Other ways to reach us">
            <ul className="grid gap-4 sm:grid-cols-3">
              <ContactMethod
                icon={<Mail className="size-4" strokeWidth={1.6} />}
                label="Email"
                value={siteConfig.support.email}
                href={`mailto:${siteConfig.support.email}`}
              />
              <ContactMethod
                icon={<Phone className="size-4" strokeWidth={1.6} />}
                label="Phone"
                value={siteConfig.support.phone}
                href={`tel:${siteConfig.support.phone.replace(/\s/g, "")}`}
              />
              <ContactMethod
                icon={<Clock className="size-4" strokeWidth={1.6} />}
                label="Hours"
                value="Sun–Thu, 10am–6pm"
              />
            </ul>
          </ContentCard>
        </HelpShell>
      </ContentBody>
    </>
  );
}

function ContactMethod({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <li className="border border-line bg-concrete p-4">
      <span className="flex items-center gap-2 text-grey-2">
        {icon}
        <span className="up-xs">{label}</span>
      </span>
      {href ? (
        <a
          href={href}
          className="mt-2 block break-words text-sm font-medium text-ink underline underline-offset-2"
        >
          {value}
        </a>
      ) : (
        <p className="mt-2 text-sm font-medium text-ink">{value}</p>
      )}
    </li>
  );
}
