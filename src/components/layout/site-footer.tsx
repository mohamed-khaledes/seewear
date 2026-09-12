import Link from "next/link";

import { footerNav, siteConfig } from "@/config/site";

export function SiteFooter() {
  return (
    <footer className="mt-px bg-ink px-6 pb-8 pt-13 text-white">
      <div className="grid max-w-[1100px] gap-8 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:gap-8">
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

      <div className="up-xs mt-10 border-t border-line-dark pt-5 opacity-45">
        © {new Date().getFullYear()} {siteConfig.name} — All prices in EGP
      </div>
    </footer>
  );
}
