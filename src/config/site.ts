export const siteConfig = {
  name: "SEEWEAR",
  tagline: "Considered menswear, made to be worn hard and kept long.",
  description:
    "SEEWEAR — considered menswear. Hoodies, tees, outerwear and accessories, shipped across Egypt from Cairo.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  locale: "en-EG",
  currency: "EGP",
  region: "EG",
  support: {
    email: "help@seewear.store",
    phone: "+20 100 000 0000",
  },
} as const;

export type NavLink = { label: string; href: string };

export const mainNav: NavLink[] = [
  { label: "Shop", href: "/products" },
  { label: "247", href: "/products?category=247" },
  { label: "Collections", href: "/products?sort=newest" },
  // "Brand" pointed at the outerwear category, which was arbitrary. Now that
  // /about exists it goes where the label actually promises.
  { label: "Brand", href: "/about" },
  { label: "Looks", href: "/products?sale=1" },
];

/**
 * The customer-help pages, in the order they are offered. The footer, the /help
 * index, the in-page sidebar and the sitemap all read this one list, so a topic
 * cannot exist in the navigation without existing as a page.
 */
export const helpTopics: (NavLink & { blurb: string })[] = [
  {
    label: "Shipping",
    href: "/help/shipping",
    blurb: "Rates, delivery windows and where we ship.",
  },
  {
    label: "Returns",
    href: "/help/returns",
    blurb: "Fourteen days to change your mind, and how to start.",
  },
  {
    label: "Size Guide",
    href: "/help/size-guide",
    blurb: "Measurements for every garment, and how to take yours.",
  },
  {
    label: "Contact",
    href: "/help/contact",
    blurb: "Reach a person. We answer within one working day.",
  },
];

/** `href` makes the column heading itself a link to that section's landing page. */
export const footerNav: { title: string; href?: string; links: NavLink[] }[] = [
  {
    title: "Shop",
    href: "/products",
    links: [
      { label: "New Arrivals", href: "/products?sort=newest" },
      { label: "T-Shirts", href: "/products?category=t-shirts" },
      { label: "Hoodies", href: "/products?category=hoodies" },
      { label: "Outerwear", href: "/products?category=outerwear" },
      { label: "Accessories", href: "/products?category=accessories" },
    ],
  },
  {
    title: "Help",
    href: "/help",
    links: [
      ...helpTopics.map(({ label, href }) => ({ label, href })),
      { label: "Track Order", href: "/account/orders" },
    ],
  },
  {
    title: "Company",
    href: "/about",
    links: [
      { label: "About", href: "/about" },
      { label: "Stores", href: "/about#stores" },
      { label: "Careers", href: "/about#careers" },
      { label: "Sustainability", href: "/about#sustainability" },
    ],
  },
];

export const marqueeItems = [
  "Shop Black Friday Sale",
  "Up to 65% Off",
  "Free Express Shipping Over EGP 4,000",
] as const;
