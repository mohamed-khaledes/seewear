/**
 * Two languages, and how a request says which one it wants.
 *
 * Arabic lives under `/ar`, not behind a cookie alone, because a search engine
 * has no cookies: `/ar/products` has to be a real, indexable page or the Arabic
 * storefront is invisible to exactly the customers it is for. The cookie is the
 * memory — once someone has chosen, every later link keeps their language, even
 * the ones written without a prefix.
 */

export const LOCALES = ["en", "ar"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/** Remembers the choice for a year; there is nothing personal in it. */
export const LOCALE_COOKIE = "seewear_locale";

/** How the middleware tells the rendering pass which language won. */
export const LOCALE_HEADER = "x-seewear-locale";

/**
 * The route without its language prefix, as the middleware saw it. A rewrite
 * makes the URL the page renders at differ from the one the visitor asked for,
 * so the canonical and hreflang links need this rather than a guess.
 */
export const PATH_HEADER = "x-seewear-path";

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  ar: "العربية",
};

/** Short form for the switcher, where there is room for two letters. */
export const LOCALE_SHORT: Record<Locale, string> = { en: "EN", ar: "ع" };

/** What `Intl` should be handed for dates and money. */
export const LOCALE_TAGS: Record<Locale, string> = { en: "en-EG", ar: "ar-EG" };

/** What goes in `<html lang>` and, for Open Graph, `og:locale`. */
export const OG_LOCALES: Record<Locale, string> = { en: "en_EG", ar: "ar_EG" };

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function dirFor(locale: Locale): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}

/**
 * Splits `/ar/products` into the locale and the route the app actually has.
 * Everything else is English at its own path.
 */
export function splitLocale(pathname: string): { locale: Locale; pathname: string } {
  for (const locale of LOCALES) {
    if (locale === DEFAULT_LOCALE) continue;
    if (pathname === `/${locale}`) return { locale, pathname: "/" };
    if (pathname.startsWith(`/${locale}/`)) {
      return { locale, pathname: pathname.slice(locale.length + 1) };
    }
  }
  return { locale: DEFAULT_LOCALE, pathname };
}

/** The same route, in the other language. */
export function localeHref(pathname: string, locale: Locale): string {
  const { pathname: bare } = splitLocale(pathname);
  if (locale === DEFAULT_LOCALE) return bare;
  return bare === "/" ? `/${locale}` : `/${locale}${bare}`;
}
