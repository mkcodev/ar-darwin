export { en } from "./en.ts";
export type { MessageKey, Messages } from "./es.ts";
export { es } from "./es.ts";
export {
  createTranslator,
  createTranslatorFrom,
  DEFAULT_LANGUAGE_PREFERENCE,
  FALLBACK_LOCALE,
  LANGUAGE_PREFERENCES,
  type LanguagePreference,
  LOCALES,
  type Locale,
  resolveLanguagePreference,
  resolveLocale,
} from "./translator.ts";
export type { Params, Translator } from "./types.ts";
