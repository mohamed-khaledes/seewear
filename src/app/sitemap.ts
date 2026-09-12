import type { MetadataRoute } from "next";

import { helpTopics, siteConfig } from "@/config/site";
import { getCategories, getProductSlugs } from "@/features/products/server";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories] = await Promise.all([
    getProductSlugs(),
    getCategories(),
  ]);

  const now = new Date();

  return [
    { url: siteConfig.url, lastModified: now, changeFrequency: "daily", priority: 1 },
    {
      url: `${siteConfig.url}/products`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${siteConfig.url}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${siteConfig.url}/help`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    // Driven by the same list the navigation uses, so a new help topic is
    // indexable the moment it is linked.
    ...helpTopics.map((topic) => ({
      url: `${siteConfig.url}${topic.href}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.4,
    })),
    ...categories.map((category) => ({
      url: `${siteConfig.url}/products?category=${category.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...products.map((product) => ({
      url: `${siteConfig.url}/product/${product.slug}`,
      lastModified: new Date(product.created_at),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
