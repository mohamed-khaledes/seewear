import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/types/database.types";
import { isSupabaseConfigured } from "./config";

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
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Before .env.local is filled in there is no session to refresh and nothing
  // to gate — let the request through so the app still renders.
  if (!isSupabaseConfigured()) return response;

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
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Do not remove: this refreshes the auth token and rewrites the cookies.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  const needsAdmin = startsWithAny(pathname, ADMIN_PREFIXES);
  const needsUser = startsWithAny(pathname, CUSTOMER_PREFIXES);

  if (!user && (needsAdmin || needsUser)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  if (user && needsAdmin) {
    const role = await resolveRole(supabase, user.id);
    if (role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  if (user && startsWithAny(pathname, AUTH_PREFIXES)) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
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
