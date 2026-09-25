import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { localeHref, type Locale } from "@/lib/i18n/config";
import type { Database } from "@/types/database.types";
import { isSupabaseConfigured } from "./config";

/**
 * What the session pass produced: the cookies the refreshed session needs to
 * set, and a redirect if this request is not allowed where it is going. The
 * response itself is built by the caller, which also has the language to fold
 * in — two middlewares writing two responses would lose one of them.
 */
type SessionCookie = { name: string; value: string; options?: CookieOptions };

type SessionOutcome = {
  cookies: SessionCookie[];
  redirect: NextResponse | null;
};

/** The route as the app knows it: no language prefix, plus which one it was. */
type Route = { locale: Locale; pathname: string };

/** Admin-only area. */
const ADMIN_PREFIXES = ["/dashboard"];
/** Signed-in customers only. */
const CUSTOMER_PREFIXES = ["/account", "/wishlist"];
/** Already signed in? These make no sense. */
const AUTH_PREFIXES = ["/login", "/signup"];

function startsWithAny(pathname: string, prefixes: string[]) {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Refreshes the Supabase session on every request and gates protected routes.
 * Role checks here are a first line of defence — RLS is the real one.
 */
export async function updateSession(
  request: NextRequest,
  route: Route,
): Promise<SessionOutcome> {
  const pending: SessionOutcome["cookies"] = [];

  // Before .env.local is filled in there is no session to refresh and nothing
  // to gate — let the request through so the app still renders.
  if (!isSupabaseConfigured()) return { cookies: pending, redirect: null };

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          for (const { name, value, options } of cookiesToSet) {
            pending.push({ name, value, options });
          }
        },
      },
    },
  );

  // Do not remove: this refreshes the auth token and rewrites the cookies.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { locale, pathname } = route;
  const { search } = request.nextUrl;

  /**
   * Sends the visitor somewhere else, in the language they are reading. An
   * Arabic shopper bounced to a sign-in page in English would have to find
   * their way back on their own.
   */
  const sendTo = (target: string, next?: string) => {
    const url = request.nextUrl.clone();
    url.pathname = localeHref(target, locale);
    url.search = "";
    if (next) url.searchParams.set("next", next);
    const redirect = NextResponse.redirect(url);
    for (const { name, value, options } of pending) redirect.cookies.set(name, value, options);
    return { cookies: pending, redirect };
  };

  const needsAdmin = startsWithAny(pathname, ADMIN_PREFIXES);
  const needsUser = startsWithAny(pathname, CUSTOMER_PREFIXES);

  if (!user && (needsAdmin || needsUser)) {
    return sendTo("/login", `${localeHref(pathname, locale)}${search}`);
  }

  if (user && needsAdmin) {
    const role = await resolveRole(supabase, user.id);
    if (role !== "admin") return sendTo("/");
  }

  if (user && startsWithAny(pathname, AUTH_PREFIXES)) return sendTo("/");

  return { cookies: pending, redirect: null };
}

/**
 * Prefers the `user_role` custom claim minted by the Supabase auth hook and
 * falls back to a profiles lookup so the gate still works before the hook is
 * configured.
 */
async function resolveRole(
  supabase: ReturnType<typeof createServerClient<Database>>,
  userId: string,
): Promise<string | null> {
  const { data: claimsData } = await supabase.auth.getClaims();
  const claim = claimsData?.claims as Record<string, unknown> | undefined;
  const claimedRole = claim?.user_role;
  if (typeof claimedRole === "string") return claimedRole;

  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  return data?.role ?? null;
}
