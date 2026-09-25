import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Geist, Geist_Mono, IBM_Plex_Sans_Arabic } from "next/font/google";

import { Providers } from "@/components/layout/providers";
import { siteConfig } from "@/config/site";
import { dirFor, LOCALES, localeHref, LocaleProvider, OG_LOCALES } from "@/lib/i18n";
import { getLocale, getMessages, getPath, getT } from "@/lib/i18n/server";

import "./globals.css";

const sans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const mono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

/**
 * Geist has no Arabic glyphs, so Arabic would fall back to whatever the device
 * happens to have — usually a system serif that reads nothing like this shop.
 * Not preloaded: an English visitor never downloads it.
 */
const arabic = IBM_Plex_Sans_Arabic({
  variable: "--font-arabic",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: false,
});

/**
 * The head, in the language being read.
 *
 * `alternates.languages` is the part that matters commercially: it tells a
 * search engine that `/products` and `/ar/products` are one page in two
 * languages rather than two shops competing, and it is what puts the Arabic URL
 * in front of someone searching in Arabic.
 */
export async function generateMetadata(): Promise<Metadata> {
  const [locale, path, t] = await Promise.all([getLocale(), getPath(), getT()]);

  const title = t("common.siteTitle");
  const description = t("common.siteDescription");

  return {
    metadataBase: new URL(siteConfig.url),
    title: { default: title, template: `%s · ${siteConfig.name}` },
    description,
    applicationName: siteConfig.name,
    alternates: {
      canonical: `${siteConfig.url}${localeHref(path, locale)}`,
      languages: {
        ...Object.fromEntries(
          LOCALES.map((other) => [other, `${siteConfig.url}${localeHref(path, other)}`]),
        ),
        "x-default": `${siteConfig.url}${path}`,
      },
    },
    openGraph: {
      type: "website",
      siteName: siteConfig.name,
      title,
      description,
      locale: OG_LOCALES[locale],
    },
    twitter: { card: "summary_large_image", title, description },
    robots: { index: true, follow: true },
  };
}

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  colorScheme: "light",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Settled by the middleware from the URL, then the cookie. It belongs on
  // <html>, not on a wrapper: dialogs and drawers render into <body> through a
  // portal, and would face the wrong way anywhere further in.
  const [locale, messages] = await Promise.all([getLocale(), getMessages()]);

  return (
    <html
      lang={locale}
      dir={dirFor(locale)}
      className={`${sans.variable} ${mono.variable} ${arabic.variable} h-full`}
    >
      <body className="flex min-h-full flex-col">
        <LocaleProvider locale={locale} messages={messages}>
          <Providers>{children}</Providers>
        </LocaleProvider>
        {/* Cookieless: page views and Core Web Vitals without identifying
            anyone, so no consent banner is needed for them. Both are inert
            outside a Vercel deployment. */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
