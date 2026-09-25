import type { MetadataRoute } from "next";

import { helpTopics, legalPages, siteConfig } from "@/config/site";
import { DEFAULT_LOCALE, LOCALES, localeHref } from "@/lib/i18n";
import { getCategories, getProductSlugs } from "@/features/products/server";

export const revalidate = 3600;

type Entry = {
  path: string;
  lastModified: Date;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
};

/**
 * Every page, in both languages.
 *
 * Each entry lists the other language as an alternate, which is what stops
 * Google treating `/products` and `/ar/products` as two shops competing with
 * each other — and what gets the Arabic pages in front of people searching in
 * Arabic, which in Egypt is most of them.
 */
function withLocales(entries: Entry[]): MetadataRoute.Sitemap {
  return entries.flatMap((entry) =>
    LOCALES.map((locale) => ({
      url: `${siteConfig.url}${localeHref(entry.path, locale)}`,
      lastModified: entry.lastModified,
      changeFrequency: entry.changeFrequency,
      // The default language stays the stronger of the two; the alternates
      // below tell a crawler they are the same page either way.
      priority: locale === DEFAULT_LOCALE ? entry.priority : entry.priority * 0.9,
      alternates: {
        languages: Object.fromEntries(
          LOCALES.map((other) => [
            other,
            `${siteConfig.url}${localeHref(entry.path, other)}`,
          ]),
        ),
      },
    })),
  );
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories] = await Promise.all([
    getProductSlugs(),
    getCategories(),
  ]);

  const now = new Date();

  return withLocales([
    { path: "/", lastModified: now, changeFrequency: "daily", priority: 1 },
    { path: "/products", lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { path: "/about", lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { path: "/help", lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { path: "/track", lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    // Driven by the same list the navigation uses, so a new help topic is
    // indexable the moment it is linked.
    ...helpTopics.map((topic) => ({
      path: topic.href,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.4,
    })),
    ...legalPages.map((page) => ({
      path: page.href,
      lastModified: now,
      changeFrequency: "yearly" as const,
      priority: 0.2,
    })),
    ...categories.map((category) => ({
      path: `/products?category=${category.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...products.map((product) => ({
      path: `/product/${product.slug}`,
      lastModified: new Date(product.created_at),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ]);
}
