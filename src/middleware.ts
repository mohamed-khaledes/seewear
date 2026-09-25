import { NextResponse, type NextRequest } from "next/server";

import {
  DEFAULT_LOCALE,
  isLocale,
  LOCALE_COOKIE,
  LOCALE_HEADER,
  PATH_HEADER,
  splitLocale,
  type Locale,
} from "@/lib/i18n/config";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Two jobs on every navigation: keep the Supabase session fresh, and settle
 * which language the page renders in.
 *
 * Arabic is a real path — `/ar/products` — which is then rewritten onto the
 * single set of routes the app actually has. That keeps the whole `src/app`
 * tree free of a `[locale]` segment while still giving search engines a URL
 * to index, because a crawler arrives without the cookie that would otherwise
 * be the only record of the choice.
 */
export async function middleware(request: NextRequest) {
  const { locale: fromPath, pathname } = splitLocale(request.nextUrl.pathname);
  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;

  const prefixed = pathname !== request.nextUrl.pathname;
  const locale: Locale = prefixed
    ? fromPath
    : isLocale(cookieLocale)
      ? cookieLocale
      : DEFAULT_LOCALE;

  // The rendering pass reads this rather than re-parsing the URL, so the header,
  // the page and every server component below them cannot disagree.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(LOCALE_HEADER, locale);
  requestHeaders.set(PATH_HEADER, pathname);

  const session = await updateSession(request, { locale, pathname });
  // A redirect is final: gating wins over anything else this would do.
  if (session.redirect) return session.redirect;

  const response = prefixed
    ? NextResponse.rewrite(new URL(`${pathname}${request.nextUrl.search}`, request.url), {
        request: { headers: requestHeaders },
      })
    : NextResponse.next({ request: { headers: requestHeaders } });

  // Cookies the session refresh wants to set have to survive the new response.
  for (const { name, value, options } of session.cookies) {
    response.cookies.set(name, value, options);
  }

  // Arriving at a prefixed URL is a choice, and it is remembered — so a link
  // written without a prefix, which is most of them, stays in that language.
  if (prefixed && cookieLocale !== locale) {
    response.cookies.set(LOCALE_COOKIE, locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Every path except static assets and image files — the session has to be
     * refreshed on navigations, not on asset requests.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2?)$).*)",
  ],
};
