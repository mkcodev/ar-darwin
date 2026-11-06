/**
 * Writes the third-party license list that Settings → «Licencias» shows:
 * apps/mobile/src/about/licenses.json, every package the mobile app depends on in production,
 * transitively, with its version and license.
 *
 *   pnpm gen:licenses          regenerate it
 *   pnpm gen:licenses --check  fail if it is out of date (CI)
 *
 * Node runs this file as is (type stripping, Node >= 26; `.mts` so it loads as ESM). It walks the installed packages
 * (`nodeLinker: hoisted`), resolving each dependency the way Node does: the package's own
 * node_modules first, then every parent's. Workspace packages (`workspace:*`) are followed but not
 * listed. Optional dependencies are left out: they are platform binaries that differ between
 * Windows and the Linux CI, and the list must come out the same on both.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  type LicenseEntry,
  normalizeLicense,
  sortLicenses,
} from "../packages/core/src/licenses.ts";

type Manifest = {
  name?: string;
  version?: string;
  license?: unknown;
  licenses?: unknown;
  private?: boolean;
  dependencies?: Record<string, string>;
};

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = join(root, "apps/mobile/src/about/licenses.json");

function readManifest(dir: string): Manifest {
  return JSON.parse(readFileSync(join(dir, "package.json"), "utf8")) as Manifest;
}

/** Where `name` is installed for the package at `fromDir`, or null if it is not. */
function resolvePackage(name: string, fromDir: string): string | null {
  let dir = fromDir;
  for (;;) {
    const candidate = join(dir, "node_modules", name);
    if (existsSync(join(candidate, "package.json"))) return candidate;
    const parent = dirname(dir);
    if (parent === dir || !parent.startsWith(root)) return null;
    dir = parent;
  }
}

function workspaceDir(name: string): string | null {
  const short = name.replace(/^@ar-darwin\//, "");
  for (const base of ["packages", "apps"]) {
    const dir = join(root, base, short);
    if (existsSync(join(dir, "package.json")) && readManifest(dir).name === name) return dir;
  }
  return null;
}

function collect(): LicenseEntry[] {
  const entries: LicenseEntry[] = [];
  const visited = new Set<string>();
  const queue: { dir: string; listed: boolean }[] = [
    { dir: join(root, "apps/mobile"), listed: false },
  ];
  while (queue.length > 0) {
    const next = queue.shift();
    if (next === undefined) break;
    if (visited.has(next.dir)) continue;
    visited.add(next.dir);
    const manifest = readManifest(next.dir);
    if (next.listed && manifest.name !== undefined) {
      entries.push({
        name: manifest.name,
        version: manifest.version ?? "",
        license: normalizeLicense(manifest.license, manifest.licenses),
      });
    }
    for (const [name, range] of Object.entries(manifest.dependencies ?? {})) {
      if (range.startsWith("workspace:")) {
        const dir = workspaceDir(name);
        if (dir === null) throw new Error(`Workspace package not found: ${name}`);
        queue.push({ dir, listed: false });
        continue;
      }
      const dir = resolvePackage(name, next.dir);
      if (dir === null) throw new Error(`${name} (needed by ${manifest.name}) is not installed`);
      queue.push({ dir, listed: true });
    }
  }
  return sortLicenses(entries);
}

const text = `${JSON.stringify(collect(), null, 2)}\n`;

if (process.argv.includes("--check")) {
  const current = existsSync(output) ? readFileSync(output, "utf8") : "";
  if (current !== text) {
    console.error("apps/mobile/src/about/licenses.json is out of date. Run: pnpm gen:licenses");
    process.exit(1);
  }
  console.log("licenses.json is up to date.");
} else {
  writeFileSync(output, text, "utf8");
  console.log(`Wrote ${output}`);
}
