import "server-only";

import { cache } from "react";
import { cookies, headers } from "next/headers";
import { unstable_rethrow } from "next/navigation";

import {
  DEFAULT_LOCALE,
  isLocale,
  LOCALE_COOKIE,
  LOCALE_HEADER,
  PATH_HEADER,
  type Locale,
} from "./config";
import { ar } from "./messages/ar";
import { en } from "./messages/en";
import { createTranslator, type Messages, type Translator } from "./translate";

const DICTIONARIES: Record<Locale, Messages> = { en, ar };

export function messagesFor(locale: Locale): Messages {
  return DICTIONARIES[locale] ?? en;
}

/**
 * Which language this request is being rendered in.
 *
 * The URL wins: `/ar/...` is Arabic for everyone, including a crawler with no
 * cookies, which is the whole reason the prefix exists. The cookie is the
 * fallback, so that once someone has chosen, a link written without a prefix
 * — and nearly all of them are — keeps them in their language.
 *
 * Cached per request: it is read in the layout, the header and half a dozen
 * pages, and they must all agree.
 */
export const getLocale = cache(async (): Promise<Locale> => {
  try {
    const fromHeader = (await headers()).get(LOCALE_HEADER);
    if (isLocale(fromHeader)) return fromHeader;

    const fromCookie = (await cookies()).get(LOCALE_COOKIE)?.value;
    if (isLocale(fromCookie)) return fromCookie;
  } catch (error) {
    // Never swallow Next's own dynamic-rendering signal: doing so would let a
    // page prerender in whichever language happened to build first.
    unstable_rethrow(error);
  }

  return DEFAULT_LOCALE;
});

/**
 * The route the visitor asked for, without its language prefix.
 *
 * Only the middleware still knows this: once a prefixed request has been
 * rewritten, the page sees a plain request for the unprefixed route, so the
 * canonical URL would otherwise always claim to be the English one.
 */
export const getPath = cache(async (): Promise<string> => {
  try {
    const fromMiddleware = (await headers()).get(PATH_HEADER);
    if (fromMiddleware?.startsWith("/")) return fromMiddleware;
  } catch (error) {
    unstable_rethrow(error);
  }
  return "/";
});

export const getMessages = cache(async (): Promise<Messages> => messagesFor(await getLocale()));

/** `const t = await getT();` in any server component. */
export const getT = cache(async (): Promise<Translator> => {
  const locale = await getLocale();
  return createTranslator(messagesFor(locale), en);
});
