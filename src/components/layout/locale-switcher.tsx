"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { cn } from "@/lib/utils";
import {
  LOCALES,
  LOCALE_LABELS,
  LOCALE_SHORT,
  useLocale,
  useT,
  type Locale,
} from "@/lib/i18n";
import { setLocaleAction } from "@/components/layout/locale-action";

/**
 * Two letters in the header: EN and ع.
 *
 * It goes through a server action rather than being a plain link, because the
 * choice has to be remembered. A link to `/ar` would work once; the cookie the
 * action sets is what keeps every later link — nearly all of them written
 * without a prefix — in the language the shopper picked.
 */
export function LocaleSwitcher({ className }: { className?: string }) {
  const current = useLocale();
  const pathname = usePathname();
  const params = useSearchParams();
  const t = useT();
  const [pending, startTransition] = useTransition();

  const query = params.toString();
  const here = query ? `${pathname}?${query}` : pathname;

  function choose(locale: Locale) {
    if (locale === current || pending) return;
    startTransition(() => setLocaleAction(locale, here));
  }

  return (
    <div
      className={cn("flex items-center gap-1 text-[11px] font-medium", className)}
      role="group"
      aria-label={t("nav.language")}
    >
      {LOCALES.map((locale, index) => (
        <span key={locale} className="flex items-center gap-1">
          {index > 0 ? <span aria-hidden="true" className="opacity-30">/</span> : null}
          <button
            type="button"
            lang={locale}
            onClick={() => choose(locale)}
            aria-current={locale === current ? "true" : undefined}
            aria-label={t("nav.switchTo", { language: LOCALE_LABELS[locale] })}
            className={cn(
              "transition-opacity hover:opacity-100",
              locale === current ? "opacity-100 underline underline-offset-4" : "opacity-60",
            )}
          >
            {LOCALE_SHORT[locale]}
          </button>
        </span>
      ))}
    </div>
  );
}
