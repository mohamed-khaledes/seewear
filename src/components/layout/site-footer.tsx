import Link from "next/link";

import { footerNav, siteConfig } from "@/config/site";
import { getStoreSettings } from "@/lib/store-settings";

/**
 * The legal line at the bottom reads the business identity from Settings. A
 * field left empty there is simply left off here, so the footer never shows a
 * placeholder where a registration number should be.
 */
export async function SiteFooter() {
  const settings = await getStoreSettings();
  const identity = [
    settings.legal_name,
    settings.commercial_register ? `C.R. ${settings.commercial_register}` : null,
    settings.tax_registration ? `Tax reg. ${settings.tax_registration}` : null,
    settings.registered_address,
  ].filter(Boolean);

  return (
    <footer data-chrome className="mt-px bg-ink px-6 pb-8 pt-13 text-white">
      <div className="grid max-w-300 gap-8 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr] lg:gap-8">
        <div>
          <p className="text-[22px] font-bold uppercase tracking-[0.3em]">
            {siteConfig.name}
          </p>
          <p className="mt-2.5 max-w-60 text-xs leading-relaxed opacity-60">
            {siteConfig.tagline} Shipped across Egypt from Cairo.
          </p>
        </div>

        {footerNav.map((group) => (
          <div key={group.title}>
            <h2 className="up-sm mb-4 opacity-60">
              {group.href ? (
                <Link href={group.href} className="transition-opacity hover:opacity-100">
                  {group.title}
                </Link>
              ) : (
                group.title
              )}
            </h2>
            <ul className="text-xs">
              {group.links.map((link) => (
                <li key={link.href} className="mb-2.5 opacity-75">
                  <Link href={link.href} className="transition-opacity hover:opacity-100">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="up-xs mt-10 flex flex-wrap justify-between gap-x-6 gap-y-2 border-t border-line-dark pt-5 opacity-45">
        <span>
          © {new Date().getFullYear()} {settings.store_name || siteConfig.name} — All prices
          in EGP
        </span>
        {identity.length > 0 ? <span>{identity.join(" · ")}</span> : null}
      </div>
    </footer>
  );
}
