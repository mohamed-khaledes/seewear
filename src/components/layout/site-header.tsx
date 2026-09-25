import Link from "next/link";

import { mainNav, siteConfig } from "@/config/site";
import { getStoreSettings } from "@/lib/store-settings";
import { getT } from "@/lib/i18n/server";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { MobileNav } from "@/components/layout/mobile-nav";
import { UserMenu } from "@/features/auth/components/user-menu";
import { BagButton } from "@/features/cart";
import { SearchDialog } from "@/features/search";
import type { SessionUser } from "@/features/auth/types";

export async function SiteHeader({ user }: { user: SessionUser | null }) {
  const [settings, t] = await Promise.all([getStoreSettings(), getT()]);

  return (
    <>
      {settings.announcement ? (
        <div data-chrome className="up-xs bg-ink px-4 py-2 text-center text-white">
          {settings.announcement}
        </div>
      ) : null}

      <header data-chrome className="sticky top-0 z-50 grid grid-cols-[auto_1fr_auto] items-center gap-4 border-b border-line-dark bg-ink px-5 py-4 text-white lg:grid-cols-[1fr_auto_1fr] lg:px-6">
        <div className="flex items-center gap-4">
          <MobileNav />
          <nav aria-label={t("nav.main")} className="hidden gap-6 text-[11px] font-medium lg:flex">
            {mainNav.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="opacity-80 transition-opacity hover:opacity-100"
              >
                {t(link.key)}
              </Link>
            ))}
          </nav>
        </div>

        <Link
          href="/"
          className="text-center text-lg font-bold uppercase tracking-[0.34em] [padding-inline-start:0.34em]"
        >
          {siteConfig.name}
        </Link>

        <div className="flex items-center justify-end gap-4 text-[11px] font-medium sm:gap-5">
          <LocaleSwitcher className="hidden sm:flex" />
          <SearchDialog />
          <UserMenu user={user} />
          <BagButton />
        </div>
      </header>
    </>
  );
}
