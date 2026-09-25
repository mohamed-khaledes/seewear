import type { MessageKey } from "@/lib/i18n";

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

/**
 * `label` is the English wording and `key` is where its translation lives.
 * Both, rather than one: the key is what the storefront renders, the label is
 * what the sitemap and the admin-facing pages read, and neither should have to
 * load a dictionary to know what a link is called.
 */
export type NavLink = { label: string; href: string; key: MessageKey };

export const mainNav: NavLink[] = [
  { label: "Shop", href: "/products", key: "nav.shop" },
  { label: "247", href: "/products?category=247", key: "nav.247" },
  { label: "Collections", href: "/products?sort=newest", key: "nav.collections" },
  // "Brand" pointed at the outerwear category, which was arbitrary. Now that
  // /about exists it goes where the label actually promises.
  { label: "Brand", href: "/about", key: "nav.brand" },
  { label: "Looks", href: "/products?sale=1", key: "nav.looks" },
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
    key: "footer.shipping",
    blurb: "Rates, delivery windows and where we ship.",
  },
  {
    label: "Returns",
    href: "/help/returns",
    key: "footer.returns",
    blurb: "Fourteen days to change your mind, and how to start.",
  },
  {
    label: "Size Guide",
    href: "/help/size-guide",
    key: "footer.sizeGuide",
    blurb: "Measurements for every garment, and how to take yours.",
  },
  {
    label: "Contact",
    href: "/help/contact",
    key: "footer.contact",
    blurb: "Reach a person. We answer within one working day.",
  },
];

/**
 * The policies a customer agrees to at checkout. Like `helpTopics`, this one
 * list feeds the footer, the legal sidebar and the sitemap.
 */
export const legalPages: (NavLink & { blurb: string })[] = [
  {
    label: "Terms of sale",
    href: "/legal/terms",
    key: "footer.terms",
    blurb: "The contract behind every order.",
  },
  {
    label: "Privacy",
    href: "/legal/privacy",
    key: "footer.privacy",
    blurb: "What we keep about you, and why.",
  },
  {
    label: "Cookies",
    href: "/legal/cookies",
    key: "footer.cookies",
    blurb: "The few we set, all of them necessary.",
  },
];

/** `href` makes the column heading itself a link to that section's landing page. */
export const footerNav: {
  title: string;
  titleKey: MessageKey;
  href?: string;
  links: NavLink[];
}[] = [
  {
    title: "Shop",
    titleKey: "footer.shop",
    href: "/products",
    links: [
      { label: "New Arrivals", href: "/products?sort=newest", key: "footer.newArrivals" },
      { label: "T-Shirts", href: "/products?category=t-shirts", key: "footer.tShirts" },
      { label: "Hoodies", href: "/products?category=hoodies", key: "footer.hoodies" },
      { label: "Outerwear", href: "/products?category=outerwear", key: "footer.outerwear" },
      { label: "Accessories", href: "/products?category=accessories", key: "footer.accessories" },
    ],
  },
  {
    title: "Help",
    titleKey: "footer.help",
    href: "/help",
    links: [
      ...helpTopics.map(({ label, href, key }) => ({ label, href, key })),
      // Public, because guest checkout means most orders have no account
      // behind them to log into.
      { label: "Track Order", href: "/track", key: "footer.trackOrder" as MessageKey },
    ],
  },
  {
    title: "Company",
    titleKey: "footer.company",
    href: "/about",
    links: [
      { label: "About", href: "/about", key: "footer.about" },
      { label: "Stores", href: "/about#stores", key: "footer.stores" },
      { label: "Careers", href: "/about#careers", key: "footer.careers" },
      { label: "Sustainability", href: "/about#sustainability", key: "footer.sustainability" },
    ],
  },
  {
    title: "Legal",
    titleKey: "footer.legal",
    links: legalPages.map(({ label, href, key }) => ({ label, href, key })),
  },
];

/** The scrolling strip under the hero, as keys so it runs in both languages. */
export const marqueeItems: MessageKey[] = [
  "home.marquee1",
  "home.marquee2",
  "home.marquee3",
];
