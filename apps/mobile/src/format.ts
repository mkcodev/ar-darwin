import { t } from "./i18n";

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
