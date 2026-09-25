/**
 * Client-safe surface of the language layer. Server components get their
 * translator from `@/lib/i18n/server`, which reads the request.
 */
export * from "./config";
export { LocaleProvider, useDir, useLocale, useLocaleTag, useT } from "./client";
export { createTranslator } from "./translate";
export type { MessageKey, Messages, Translator } from "./translate";
