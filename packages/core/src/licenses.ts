/**
 * The third-party license list shown in Settings, built by `scripts/generate-licenses.ts` from the
 * mobile app's production dependencies. No imports: the Node script loads this file as is.
 */

/** One package of the list. */
export type LicenseEntry = { name: string; version: string; license: string };

/** What a package.json without a readable license gets. */
export const UNKNOWN_LICENSE = "UNKNOWN";

function licenseName(value: unknown): string | null {
  if (typeof value === "string") return value.trim() === "" ? null : value.trim();
  if (typeof value === "object" && value !== null && "type" in value) {
    return licenseName(value.type);
  }
  return null;
}

/**
 * The license of a package.json as one SPDX text. Reads the `license` field (a string, or the old
 * `{ type }` object) and falls back on the older `licenses` array, joined with « OR ». Anything
 * unreadable is `UNKNOWN_LICENSE`.
 */
export function normalizeLicense(license: unknown, legacyLicenses?: unknown): string {
  const single = licenseName(license);
  if (single !== null) return single;
  const list = Array.isArray(license) ? license : legacyLicenses;
  if (Array.isArray(list)) {
    const names = list.map(licenseName).filter((name): name is string => name !== null);
    if (names.length > 0)
      return names.length === 1 ? (names[0] ?? UNKNOWN_LICENSE) : `(${names.join(" OR ")})`;
  }
  return UNKNOWN_LICENSE;
}

/** The list once per name and version, sorted by name (then version), the way it is shown. */
export function sortLicenses(entries: readonly LicenseEntry[]): LicenseEntry[] {
  const seen = new Map<string, LicenseEntry>();
  for (const entry of entries) seen.set(`${entry.name}@${entry.version}`, entry);
  return [...seen.values()].sort(
    (a, b) => a.name.localeCompare(b.name, "en") || a.version.localeCompare(b.version, "en"),
  );
}
