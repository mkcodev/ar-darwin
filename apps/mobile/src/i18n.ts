import { createTranslator, resolveLocale } from "@ar-darwin/i18n";
import { getLocales } from "expo-localization";

export const t = createTranslator(resolveLocale(getLocales().map((l) => l.languageTag)));
