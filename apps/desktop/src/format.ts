import { locale } from "./i18n";

const formatters = new Map<number, Intl.NumberFormat>();

/** Number in the page's locale with a fixed number of decimals: 15.4 → «15,4» in Spanish. */
export function formatNumber(value: number, decimals: number): string {
  let f = formatters.get(decimals);
  if (!f) {
    f = new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    formatters.set(decimals, f);
  }
  return f.format(value);
}
