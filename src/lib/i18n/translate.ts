import type { en } from "./messages/en";

/**
 * The shape every language has to fill in. English is the source of truth, so
 * a new string is added there first and Arabic stops compiling until it is
 * translated — which is the only reliable way to keep a second language from
 * quietly rotting.
 */
export type Messages = typeof en;

/** Every dotted path that ends in a string, e.g. `"cart.empty.title"`. */
export type MessageKey = Leaves<Messages>;

type Leaves<T> = T extends string
  ? never
  : {
      [K in keyof T & string]: T[K] extends string ? K : `${K}.${Leaves<T[K]>}`;
    }[keyof T & string];

export type Translator = (
  key: MessageKey,
  vars?: Record<string, string | number>,
) => string;

function lookup(messages: unknown, key: string): string | undefined {
  let current: unknown = messages;
  for (const part of key.split(".")) {
    if (typeof current !== "object" || current === null) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : undefined;
}

/**
 * Builds the `t` used everywhere. Placeholders are `{name}`, filled from the
 * second argument; a string with no placeholders needs no second argument.
 *
 * A key that somehow resolves to nothing falls back to English rather than
 * rendering an empty element — a missing translation should look like an
 * untranslated shop, not a broken one.
 */
export function createTranslator(messages: Messages, fallback?: Messages): Translator {
  return (key, vars) => {
    const template = lookup(messages, key) ?? (fallback ? lookup(fallback, key) : undefined);
    if (template === undefined) return key;
    if (!vars) return template;

    return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
      name in vars ? String(vars[name]) : whole,
    );
  };
}
