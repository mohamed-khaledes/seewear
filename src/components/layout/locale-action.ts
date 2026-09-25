"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { isLocale, localeHref, LOCALE_COOKIE, type Locale } from "@/lib/i18n/config";

/**
 * Remembers the language and reloads the page the visitor is on, in it.
 *
 * The `next` path is taken apart and rebuilt rather than trusted: it arrives
 * from the browser, and a value like `//evil.example` is a redirect off this
 * site. Only a path is ever honoured.
 */
export async function setLocaleAction(locale: Locale, next: string) {
  if (!isLocale(locale)) return;

  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  const safe = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  redirect(localeHref(safe, locale));
}
