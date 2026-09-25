"use client";

import { createContext, useContext, useMemo } from "react";

import { DEFAULT_LOCALE, dirFor, LOCALE_TAGS, type Locale } from "./config";
import { en } from "./messages/en";
import { createTranslator, type Messages, type Translator } from "./translate";

type LocaleContextValue = {
  locale: Locale;
  messages: Messages;
};

const LocaleContext = createContext<LocaleContextValue>({
  locale: DEFAULT_LOCALE,
  messages: en,
});

/**
 * Hands the chosen language to every client component below it.
 *
 * The dictionary is passed down rather than imported, so a browser only ever
 * downloads the language it is reading, and the words a client component shows
 * are the same ones the server rendered — no flash of English on hydration.
 */
export function LocaleProvider({
  locale,
  messages,
  children,
}: LocaleContextValue & { children: React.ReactNode }) {
  const value = useMemo(() => ({ locale, messages }), [locale, messages]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext).locale;
}

/** `const t = useT();` in any client component. */
export function useT(): Translator {
  const { messages } = useContext(LocaleContext);
  return useMemo(() => createTranslator(messages, en), [messages]);
}

/** The BCP 47 tag for `Intl`, for money and dates rendered in the browser. */
export function useLocaleTag(): string {
  return LOCALE_TAGS[useLocale()];
}

export function useDir(): "rtl" | "ltr" {
  return dirFor(useLocale());
}
