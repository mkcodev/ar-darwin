/**
 * Where a project's files live, as stored in the database. Never an absolute `file://` URI: on
 * iOS the app container path changes with every update, so absolute URIs saved by an older
 * version point nowhere. Two shapes:
 * - a path relative to the app's document directory (`projects/<id>/source.jpg`), the files the
 *   app owns and deletes with the project;
 * - a bundled asset (`asset:<name>`), kept verbatim and resolved by the app itself.
 */
export const ASSET_URI_PREFIX = "asset:";

const SCHEME = /^[a-z][a-z0-9+.-]*:/i;

export function isAssetUri(stored: string): boolean {
  return stored.startsWith(ASSET_URI_PREFIX) && stored.length > ASSET_URI_PREFIX.length;
}

/** True for a value that is safe to store: an asset URI or a relative path inside the document dir. */
export function isStoredUri(value: string): boolean {
  if (isAssetUri(value)) return true;
  if (value.length === 0 || SCHEME.test(value) || value.startsWith("/") || value.includes("\\")) {
    return false;
  }
  return value.split("/").every((segment) => segment !== "" && segment !== "." && segment !== "..");
}

/** Only the files under the document directory belong to the app; bundled assets never do. */
export function isAppOwnedFile(stored: string): boolean {
  return !isAssetUri(stored);
}

/** `file:///a/b` and `/a/b` name the same file: compare paths without the scheme. */
function stripFileScheme(uri: string): string {
  return uri.startsWith("file://") ? uri.slice("file://".length) : uri;
}

function withTrailingSlash(dir: string): string {
  return dir.endsWith("/") ? dir : `${dir}/`;
}

/** Absolute URI of a file inside `documentDir` (e.g. `Paths.document.uri`) → the value to store. */
export function toStoredUri(uri: string, documentDir: string): string {
  if (isAssetUri(uri)) return uri;
  const dir = withTrailingSlash(stripFileScheme(documentDir));
  const path = stripFileScheme(uri);
  const relative = path.startsWith(dir) ? path.slice(dir.length) : null;
  if (relative === null || !isStoredUri(relative)) {
    throw new Error(`toStoredUri: ${uri} is not inside the document directory ${documentDir}`);
  }
  return relative;
}

/** Stored value → URI to read the file now. Assets come back unchanged. */
export function resolveStoredUri(stored: string, documentDir: string): string {
  if (isAssetUri(stored)) return stored;
  if (!isStoredUri(stored)) {
    throw new Error(`resolveStoredUri: ${stored} is not a stored URI`);
  }
  return `${withTrailingSlash(documentDir)}${stored}`;
}
