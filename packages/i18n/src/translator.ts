import { en } from "./en.ts";
import { es, type Messages } from "./es.ts";
import type { Dictionary, Shape, Translator } from "./types.ts";

export const LOCALES = ["es", "en"] as const;
export type Locale = (typeof LOCALES)[number];

/** Used when none of the system languages is supported. */
export const FALLBACK_LOCALE: Locale = "en";

const dictionaries: Record<Locale, Messages> = { es, en };

/**
 * Picks the first supported language from BCP 47 tags in order of preference
 * ("es-MX" → "es"), or FALLBACK_LOCALE.
 */
export function resolveLocale(tags: readonly string[]): Locale {
  for (const tag of tags) {
    const language = tag.split(/[-_]/)[0]?.toLowerCase();
    const match = LOCALES.find((locale) => locale === language);
    if (match) return match;
  }
  return FALLBACK_LOCALE;
}

function lookup(dictionary: Dictionary, key: string): string | undefined {
  let node: string | Dictionary | undefined = dictionary;
  for (const part of key.split(".")) {
    if (typeof node !== "object") return undefined;
    node = node[part];
  }
  return typeof node === "string" ? node : undefined;
}

/**
 * Translator over any dictionary, typed by the source dictionary `Source`.
 * Missing keys return the key and missing params keep their {placeholder}; types prevent both.
 */
export function createTranslatorFrom<Source>(dictionary: Shape<Source>): Translator<Source> {
  const messages: Dictionary = dictionary as Dictionary;
  const translate = (key: string, params?: Record<string, string | number>): string => {
    const message = lookup(messages, key);
    if (message === undefined) return key;
    return message.replace(/\{(\w+)\}/g, (placeholder, name: string) => {
      const value = params?.[name];
      return value === undefined ? placeholder : String(value);
    });
  };
  return translate as Translator<Source>;
}

/** `t` for one locale, with keys and {params} typed from the Spanish source. */
export function createTranslator(locale: Locale): Translator<typeof es> {
  return createTranslatorFrom<typeof es>(dictionaries[locale]);
}
