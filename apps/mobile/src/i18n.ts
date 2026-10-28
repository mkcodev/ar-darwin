import {
  createTranslator,
  type LanguagePreference,
  type Locale,
  resolveLanguagePreference,
} from "@ar-darwin/i18n";
import { getLocales } from "expo-localization";

const systemTags = getLocales().map((l) => l.languageTag);

/** The system's language, which the app uses until a stored preference is applied. */
export const systemLocale = resolveLanguagePreference("system", systemTags);

let current: Locale = systemLocale;
let translator = createTranslator(current);

/** The language a preference gives on this device (`"system"` follows the system's). */
export function localeFor(preference: LanguagePreference): Locale {
  return resolveLanguagePreference(preference, systemTags);
}

/** The app's language, also for dates and numbers (`Intl`). */
export function getLocale(): Locale {
  return current;
}

/**
 * Sets the language for the rest of this run. Called once at start-up, before any screen renders
 * (`AppSettingsProvider`): changing it afterwards does not repaint what is already on screen, and
 * Settings tells the person it applies on the next start.
 */
export function applyLocale(preference: LanguagePreference): void {
  current = localeFor(preference);
  translator = createTranslator(current);
}

type Translate = ReturnType<typeof createTranslator>;

/**
 * Translates `key` into the app's language. Keys and `{params}` are typed from the Spanish source;
 * the call is forwarded untyped to the translator of the language in use.
 */
export const t = ((key: string, params?: object) =>
  (translator as unknown as (key: string, params?: object) => string)(key, params)) as Translate;
