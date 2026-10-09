import { createTranslator, resolveLocale } from "@ar-darwin/i18n";

export const locale = resolveLocale(navigator.languages);
export const t = createTranslator(locale);
