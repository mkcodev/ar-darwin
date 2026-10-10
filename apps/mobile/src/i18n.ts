import { createTranslator, resolveLocale } from "@ar-darwin/i18n";
import { getLocales } from "expo-localization";

/** The app's language, also for dates and numbers (`Intl`). */
export const locale = resolveLocale(getLocales().map((l) => l.languageTag));

export const t = createTranslator(locale);
