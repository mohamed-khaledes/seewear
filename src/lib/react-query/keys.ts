import type { ProductFilters } from "@/features/products/types";

/**
 * Every query key in the app lives here so invalidation never guesses.
 * Keys are hierarchical: invalidating `queryKeys.products.all` clears lists and
 * details alike.
 */
export const queryKeys = {
  products: {
    all: ["products"] as const,
    lists: () => [...queryKeys.products.all, "list"] as const,
    list: (filters: ProductFilters) =>
      [...queryKeys.products.lists(), filters] as const,
    featured: () => [...queryKeys.products.all, "featured"] as const,
    details: () => [...queryKeys.products.all, "detail"] as const,
    detail: (slug: string) => [...queryKeys.products.details(), slug] as const,
    related: (slug: string) => [...queryKeys.products.all, "related", slug] as const,
  },
  categories: {
    all: ["categories"] as const,
    list: () => [...queryKeys.categories.all, "list"] as const,
  },
  facets: {
    all: ["facets"] as const,
    list: () => [...queryKeys.facets.all, "list"] as const,
  },
  cart: {
    all: ["cart"] as const,
    server: () => [...queryKeys.cart.all, "server"] as const,
    stock: (variantIds: string[]) =>
      [...queryKeys.cart.all, "stock", [...variantIds].sort()] as const,
  },
  wishlist: {
    all: ["wishlist"] as const,
    list: () => [...queryKeys.wishlist.all, "list"] as const,
    ids: () => [...queryKeys.wishlist.all, "ids"] as const,
  },
  orders: {
    all: ["orders"] as const,
    list: () => [...queryKeys.orders.all, "list"] as const,
    detail: (orderNumber: string) =>
      [...queryKeys.orders.all, "detail", orderNumber] as const,
  },
  auth: {
    all: ["auth"] as const,
    session: () => [...queryKeys.auth.all, "session"] as const,
    profile: () => [...queryKeys.auth.all, "profile"] as const,
  },
  dashboard: {
    all: ["dashboard"] as const,
    stats: (days: number) => [...queryKeys.dashboard.all, "stats", days] as const,
    products: (search: string, status: string) =>
      [...queryKeys.dashboard.all, "products", { search, status }] as const,
    orders: (status: string) =>
      [...queryKeys.dashboard.all, "orders", status] as const,
    order: (id: string) => [...queryKeys.dashboard.all, "order", id] as const,
    customers: (search: string) =>
      [...queryKeys.dashboard.all, "customers", search] as const,
    payments: () => [...queryKeys.dashboard.all, "payments"] as const,
    settings: () => [...queryKeys.dashboard.all, "settings"] as const,
  },
} as const;
