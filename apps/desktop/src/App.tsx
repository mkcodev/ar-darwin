import { createTranslator, resolveLocale } from "@ar-darwin/i18n";

const t = createTranslator(resolveLocale(navigator.languages));

export function App() {
  return <main>{t("app.name")}</main>;
}
