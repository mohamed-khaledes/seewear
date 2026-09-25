"use client";

import Link from "next/link";
import { Menu } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { mainNav, footerNav, siteConfig } from "@/config/site";
import { useT } from "@/lib/i18n";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { useUiStore } from "@/stores/ui-store";

export function MobileNav() {
  const open = useUiStore((state) => state.mobileNavOpen);
  const setOpen = useUiStore((state) => state.setMobileNavOpen);
  const t = useT();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label={t("nav.openMenu")}
        className="text-white/90 transition-opacity hover:text-white lg:hidden"
      >
        <Menu className="size-[18px]" strokeWidth={1.5} />
      </SheetTrigger>

      <SheetContent side="left" className="w-full gap-0 border-line-dark bg-ink p-0 text-white sm:max-w-sm">
        <SheetHeader className="border-b border-line-dark px-6 py-5">
          <SheetTitle className="up text-base font-bold tracking-[0.32em] text-white">
            {siteConfig.name}
          </SheetTitle>
        </SheetHeader>

        <nav className="flex flex-col px-6 py-6">
          {mainNav.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="border-b border-line-dark py-4 text-lg font-semibold"
            >
              {t(link.key)}
            </Link>
          ))}
        </nav>

        <div className="border-b border-line-dark px-6 pb-6">
          <LocaleSwitcher className="text-sm" />
        </div>

        <div className="grid gap-6 px-6 pb-10 pt-6">
          {footerNav.slice(0, 2).map((group) => (
            <div key={group.title}>
              <p className="up-xs text-white/45">{t(group.titleKey)}</p>
              <ul className="mt-3 grid gap-2">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className="text-sm text-white/75"
                    >
                      {t(link.key)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
