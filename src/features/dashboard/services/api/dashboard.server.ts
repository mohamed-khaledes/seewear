import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isServiceRoleConfigured, isSupabaseConfigured } from "@/lib/supabase/config";
import { ADMIN_PAGE_SIZE, LOW_STOCK_THRESHOLD } from "@/config/constants";
import type { Enums, Tables } from "@/types/database.types";
import type {
  AdminPage,
  AdminOrderDetail,
  AdminOrderRow,
  AdminProductRow,
  CategoryRow,
  CustomerRow,
  DashboardStats,
  PaymentRow,
  PaymentsSummary,
} from "@/features/dashboard/types";

const EMPTY_STATS: DashboardStats = {
  range_days: 30,
  revenue_cents: 0,
  previous_revenue_cents: 0,
  orders_count: 0,
  previous_orders_count: 0,
  aov_cents: 0,
  previous_aov_cents: 0,
  completion_rate: 0,
  previous_completion_rate: 0,
  series: [],
  top_products: [],
  recent_orders: [],
  low_stock: [],
};

export async function getDashboardStats(days = 30): Promise<DashboardStats> {
  if (!isSupabaseConfigured()) return EMPTY_STATS;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_dashboard_stats", {
    p_days: days,
  });

  if (error) {
    console.error("[dashboard] stats failed", error);
    return EMPTY_STATS;
  }

  return { ...EMPTY_STATS, ...(data as unknown as DashboardStats) };
}

const ADMIN_PRODUCT_COLUMNS = `
  *,
  category:categories(slug, name),
  images:product_images(url, position),
  variants:product_variants(id, color, color_hex, size, sku, stock)
`;

function emptyPage<T>(page: number, perPage: number): AdminPage<T> {
  return { rows: [], total: 0, page, perPage, totalPages: 0 };
}

/** Clamp a page number out of the URL to something the query can use. */
function pageBounds(page = 1, perPage = ADMIN_PAGE_SIZE) {
  const current = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  return { current, from: (current - 1) * perPage, to: current * perPage - 1 };
}

export type AdminProductQuery = {
  search?: string;
  /** "active" | "draft" — anything else means no status filter. */
  status?: string;
  /** "low" | "out" — derived from summed variant stock, so not a SQL column. */
  stock?: string;
  page?: number;
  perPage?: number;
};

/**
 * One page of products.
 *
 * Search and status are real columns, so they page in SQL with an exact count
 * and the database returns twenty rows however large the catalogue gets.
 *
 * The stock filters are the exception: "low" and "out" are sums over
 * `product_variants`, which PostgREST cannot filter on. Those two take a narrow
 * pass first — ids and stock numbers only, no images or descriptions — and page
 * the surviving ids. If the catalogue ever outgrows even that, the fix is a
 * view or RPC exposing total stock as a column.
 */
export async function getAdminProducts(
  options: AdminProductQuery = {},
): Promise<AdminPage<AdminProductRow>> {
  const perPage = options.perPage ?? ADMIN_PAGE_SIZE;
  const { current, from, to } = pageBounds(options.page, perPage);

  if (!isSupabaseConfigured()) return emptyPage(current, perPage);

  const supabase = await createClient();

  const withFilters = <Q extends { ilike: (c: string, p: string) => Q; eq: (c: string, v: string) => Q }>(
    query: Q,
  ): Q => {
    let next = query;
    if (options.search) next = next.ilike("name", `%${options.search}%`);
    if (options.status === "active" || options.status === "draft") {
      next = next.eq("status", options.status);
    }
    return next;
  };

  const sortImages = (rows: AdminProductRow[]) =>
    rows.map((product) => ({
      ...product,
      images: [...product.images].sort((a, b) => a.position - b.position),
    }));

  if (options.stock === "low" || options.stock === "out") {
    const { data: slim, error: slimError } = await withFilters(
      supabase.from("products").select("id, created_at, variants:product_variants(stock)"),
    )
      .order("created_at", { ascending: false })
      .returns<{ id: string; variants: { stock: number }[] }[]>();

    if (slimError) throw slimError;

    const matching = (slim ?? []).filter((product) => {
      const total = product.variants.reduce((sum, variant) => sum + variant.stock, 0);
      return options.stock === "out" ? total === 0 : total > 0 && total < LOW_STOCK_THRESHOLD;
    });

    const ids = matching.slice(from, to + 1).map((product) => product.id);
    if (ids.length === 0) {
      return { ...emptyPage<AdminProductRow>(current, perPage), total: matching.length,
        totalPages: Math.ceil(matching.length / perPage) };
    }

    const { data, error } = await supabase
      .from("products")
      .select(ADMIN_PRODUCT_COLUMNS)
      .in("id", ids)
      .order("created_at", { ascending: false })
      .returns<AdminProductRow[]>();

    if (error) throw error;

    return {
      rows: sortImages(data ?? []),
      total: matching.length,
      page: current,
      perPage,
      totalPages: Math.ceil(matching.length / perPage),
    };
  }

  const { data, error, count } = await withFilters(
    supabase.from("products").select(ADMIN_PRODUCT_COLUMNS, { count: "exact" }),
  )
    .order("created_at", { ascending: false })
    .range(from, to)
    .returns<AdminProductRow[]>();

  if (error) throw error;

  const total = count ?? 0;
  return {
    rows: sortImages(data ?? []),
    total,
    page: current,
    perPage,
    totalPages: Math.ceil(total / perPage),
  };
}

/**
 * The five filter-chip counts, as five cheap count-only queries. PostgREST
 * returns the count in a header, so none of these transfer any rows — except
 * the two stock buckets, which need the variant sums and so read one slim row
 * per product.
 */
export async function getAdminProductCounts(search = ""): Promise<{
  all: number;
  active: number;
  draft: number;
  low: number;
  out: number;
}> {
  if (!isSupabaseConfigured()) return { all: 0, active: 0, draft: 0, low: 0, out: 0 };

  const supabase = await createClient();
  const base = (status?: "active" | "draft") => {
    let query = supabase
      .from("products")
      .select("id", { count: "exact", head: true });
    if (search) query = query.ilike("name", `%${search}%`);
    if (status) query = query.eq("status", status);
    return query;
  };

  let slim = supabase.from("products").select("id, variants:product_variants(stock)");
  if (search) slim = slim.ilike("name", `%${search}%`);

  const [all, active, draft, stocks] = await Promise.all([
    base(),
    base("active"),
    base("draft"),
    slim.returns<{ id: string; variants: { stock: number }[] }[]>(),
  ]);

  let low = 0;
  let out = 0;
  for (const product of stocks.data ?? []) {
    const total = product.variants.reduce((sum, variant) => sum + variant.stock, 0);
    if (total === 0) out += 1;
    else if (total < LOW_STOCK_THRESHOLD) low += 1;
  }

  return {
    all: all.count ?? 0,
    active: active.count ?? 0,
    draft: draft.count ?? 0,
    low,
    out,
  };
}

export async function getAdminProduct(id: string): Promise<AdminProductRow | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(ADMIN_PRODUCT_COLUMNS)
    .eq("id", id)
    .maybeSingle<AdminProductRow>();

  if (error) throw error;
  if (!data) return null;

  return { ...data, images: [...data.images].sort((a, b) => a.position - b.position) };
}

type RawAdminOrder = Pick<
  Tables<"orders">,
  "id" | "order_number" | "email" | "status" | "total_cents" | "created_at" | "fulfilled_at"
> & {
  profile: { full_name: string | null } | null;
  items: { quantity: number }[];
};

export async function getAdminOrders(
  status?: string,
  page = 1,
  perPage = ADMIN_PAGE_SIZE,
): Promise<AdminPage<AdminOrderRow>> {
  const { current, from, to } = pageBounds(page, perPage);
  if (!isSupabaseConfigured()) return emptyPage(current, perPage);

  const supabase = await createClient();
  let query = supabase
    .from("orders")
    .select(
      `id, order_number, email, status, total_cents, created_at, fulfilled_at,
       profile:profiles(full_name),
       items:order_items(quantity)`,
      { count: "exact" },
    );

  const ORDER_STATUSES = [
    "pending",
    "paid",
    "fulfilled",
    "delivered",
    "cancelled",
    "refunded",
  ] as const satisfies readonly Enums<"order_status">[];

  if (status && status !== "all") {
    // "unfulfilled" is a view over paid-but-not-shipped, not a stored status.
    if (status === "unfulfilled") {
      query = query.eq("status", "paid");
    } else if ((ORDER_STATUSES as readonly string[]).includes(status)) {
      query = query.eq("status", status as Enums<"order_status">);
    }
  }

  // Paged in SQL rather than the old flat limit(200), which both truncated the
  // table silently and shipped every one of those rows to render twenty.
  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to)
    .returns<RawAdminOrder[]>();

  if (error) throw error;

  const total = count ?? 0;
  return {
    rows: (data ?? []).map((order) => ({
      id: order.id,
      order_number: order.order_number,
      email: order.email,
      status: order.status,
      total_cents: order.total_cents,
      created_at: order.created_at,
      fulfilled_at: order.fulfilled_at,
      customer: order.profile?.full_name ?? order.email.split("@")[0],
      item_count: order.items.reduce((count, item) => count + item.quantity, 0),
    })),
    total,
    page: current,
    perPage,
    totalPages: Math.ceil(total / perPage),
  };
}

/** Orders per status, for the filter chips — counts only, no rows. */
export async function getAdminOrderCounts(): Promise<Record<string, number>> {
  if (!isSupabaseConfigured()) return {};

  const supabase = await createClient();
  const statuses: Enums<"order_status">[] = [
    "pending",
    "paid",
    "fulfilled",
    "delivered",
    "cancelled",
    "refunded",
  ];

  const [all, ...perStatus] = await Promise.all([
    supabase.from("orders").select("id", { count: "exact", head: true }),
    ...statuses.map((status) =>
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", status),
    ),
  ]);

  const counts: Record<string, number> = { all: all.count ?? 0 };
  statuses.forEach((status, index) => {
    counts[status] = perStatus[index].count ?? 0;
  });
  // "unfulfilled" is the paid-but-not-shipped view, not a stored status.
  counts.unfulfilled = counts.paid ?? 0;
  return counts;
}

export async function getAdminOrder(id: string): Promise<AdminOrderDetail | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      `*, items:order_items(*), payments:payments(*), events:order_events(*),
       profile:profiles(full_name, phone)`,
    )
    .eq("id", id)
    .maybeSingle<AdminOrderDetail>();

  if (error) throw error;
  if (!data) return null;

  // Oldest first: the activity list reads downwards, like the customer timeline.
  return {
    ...data,
    events: [...data.events].sort((a, b) => a.created_at.localeCompare(b.created_at)),
  };
}

/**
 * Customer emails live in `auth.users`, so this one needs the service role.
 * It stays behind the admin-only dashboard layout and the RLS-backed guard.
 */
export async function getCustomers(
  search = "",
  page = 1,
  perPage = ADMIN_PAGE_SIZE,
): Promise<AdminPage<CustomerRow>> {
  const { current, from, to } = pageBounds(page, perPage);
  if (!isServiceRoleConfigured()) return emptyPage(current, perPage);

  const admin = createAdminClient();

  // Name search runs in SQL. Email lives in auth.users, which this cannot join,
  // so an email search is matched after the page is fetched — see below.
  let profileQuery = admin.from("profiles").select("*", { count: "exact" });
  const term = search.trim().toLowerCase();
  if (term) profileQuery = profileQuery.ilike("full_name", `%${term}%`);

  const { data: profiles, error, count } = await profileQuery
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw error;

  const ids = (profiles ?? []).map((profile) => profile.id);
  if (ids.length === 0) {
    const total = count ?? 0;
    return { rows: [], total, page: current, perPage, totalPages: Math.ceil(total / perPage) };
  }

  // Only this page's customers, not every order in the store.
  const { data: orders } = await admin
    .from("orders")
    .select("user_id, total_cents, status")
    .in("user_id", ids);

  const totals = new Map<string, { count: number; cents: number }>();
  for (const order of orders ?? []) {
    if (!order.user_id) continue;
    // Delivered counts too, or lifetime value would fall the moment a parcel
    // actually arrived.
    if (!["paid", "fulfilled", "delivered"].includes(order.status)) continue;
    const entry = totals.get(order.user_id) ?? { count: 0, cents: 0 };
    entry.count += 1;
    entry.cents += order.total_cents;
    totals.set(order.user_id, entry);
  }

  const { data: userList } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const emails = new Map(userList?.users.map((user) => [user.id, user.email ?? null]));

  const total = count ?? 0;
  return {
    rows: (profiles ?? []).map((profile) => ({
      ...profile,
      email: emails.get(profile.id) ?? null,
      order_count: totals.get(profile.id)?.count ?? 0,
      lifetime_cents: totals.get(profile.id)?.cents ?? 0,
    })),
    total,
    page: current,
    perPage,
    totalPages: Math.ceil(total / perPage),
  };
}

export async function getPaymentsSummary(
  page = 1,
  perPage = ADMIN_PAGE_SIZE,
): Promise<PaymentsSummary> {
  if (!isSupabaseConfigured()) {
    return {
      succeededCents: 0, pendingCents: 0, refundedCents: 0, transactions: [],
      page: 1, perPage, total: 0, totalPages: 0,
    };
  }

  const { current, from, to } = pageBounds(page, perPage);
  const supabase = await createClient();

  // The balance figures cover every payment ever taken, so they come from a
  // narrow amount+status read. The table below them is paged — it used to show
  // the newest 100 and compute the balances from only those, which quietly
  // understated the totals the moment the store passed a hundred payments.
  const [ledger, listing] = await Promise.all([
    supabase.from("payments").select("amount_cents, status"),
    supabase
      .from("payments")
      .select("*, order:orders(order_number)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to)
      .returns<PaymentRow[]>(),
  ]);

  if (listing.error) throw listing.error;

  const all = (ledger.data ?? []) as { amount_cents: number; status: string }[];
  const total = listing.count ?? 0;

  return {
    succeededCents: sumWhere(all, "success"),
    pendingCents: sumWhere(all, "pending"),
    refundedCents: Math.abs(sumWhere(all, "refunded")),
    transactions: listing.data ?? [],
    page: current,
    perPage,
    total,
    totalPages: Math.ceil(total / perPage),
  };
}

function sumWhere(rows: { amount_cents: number; status: string }[], status: string): number {
  return rows
    .filter((row) => row.status === status)
    .reduce((total, row) => total + row.amount_cents, 0);
}

export async function getAdminStoreSettings(): Promise<Tables<"store_settings"> | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("store_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  return data;
}

export async function getDiscounts(): Promise<Tables<"discount_codes">[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("discount_codes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getAdminCategories(): Promise<
  { id: string; slug: string; name: string }[]
> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, slug, name")
    .order("position");

  if (error) throw error;
  return data ?? [];
}

/**
 * Categories with their weight in the catalogue.
 *
 * The counts come from one narrow read of `products` — two columns, no images
 * or descriptions — rather than a count query per category. That stays a single
 * round trip however many categories the store grows.
 */
export async function getAdminCategoryRows(): Promise<{
  rows: CategoryRow[];
  /** Live products filed under nothing — findable by search only. */
  uncategorised: number;
}> {
  if (!isSupabaseConfigured()) return { rows: [], uncategorised: 0 };

  const supabase = await createClient();
  const [categories, products] = await Promise.all([
    supabase.from("categories").select("*").order("position").order("name"),
    supabase.from("products").select("category_id, status"),
  ]);

  if (categories.error) throw categories.error;
  if (products.error) throw products.error;

  const counts = new Map<string, { all: number; active: number }>();
  let uncategorised = 0;
  for (const product of products.data ?? []) {
    if (!product.category_id) {
      uncategorised += 1;
      continue;
    }
    const entry = counts.get(product.category_id) ?? { all: 0, active: 0 };
    entry.all += 1;
    if (product.status === "active") entry.active += 1;
    counts.set(product.category_id, entry);
  }

  return {
    rows: (categories.data ?? []).map((category) => ({
      ...category,
      product_count: counts.get(category.id)?.all ?? 0,
      active_count: counts.get(category.id)?.active ?? 0,
    })),
    uncategorised,
  };
}
