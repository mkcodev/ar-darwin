import { useMemo } from "react";
import { getLocale, t } from "./i18n";

let decimal: Intl.NumberFormat | null = null;

/**
 * A number with up to one decimal, written the way the app's language does («59,4» / «59.4»).
 * The formatter is made on first use, once the language is applied (`applyLocale`).
 */
export function formatDecimal(value: number): string {
  decimal ??= new Intl.NumberFormat(getLocale(), { maximumFractionDigits: 1 });
  return decimal.format(value);
}

/**
 * A worklet that writes a value as a percentage with the locale's own text around the number
 * (`common.percent`, e.g. "62 %"), so a slider can paint its readout on the UI thread. `max` is
 * the value that reads as 100 % (1 for an opacity, 100 for a 0–100 range).
 */
export function percentFormat(max: number): (value: number) => string {
  const marker = "\u0000";
  const [prefix = "", suffix = ""] = t("common.percent", { value: marker }).split(marker);
  return (value: number) => {
    "worklet";
    return `${prefix}${Math.round((value / max) * 100)}${suffix}`;
  };
}

/**
 * `percentFormat` made when the component first renders, not when its file is imported: the
 * language is read from storage after the imports run, so a module-level one would keep the
 * system's language.
 */
export function usePercentFormat(max: number): (value: number) => string {
  return useMemo(() => percentFormat(max), [max]);
}
