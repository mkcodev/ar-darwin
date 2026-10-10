import { isAppOwnedFile, resolveStoredUri, toStoredUri } from "@ar-darwin/core";
import { Directory, File, Paths } from "expo-file-system";

/**
 * The app's files on disk, always through stored URIs (relative to the document directory, see
 * packages/core/src/filePath.ts): the absolute path is resolved on every read because the iOS
 * container moves on each update.
 */
function documentDir(): string {
  return Paths.document.uri;
}

export function storedFileExists(stored: string): boolean {
  if (!isAppOwnedFile(stored)) return true;
  return new File(resolveStoredUri(stored, documentDir())).exists;
}

/** Deletes a file the app owns. Bundled assets and files already gone are skipped. */
export function deleteStoredFile(stored: string): void {
  if (!isAppOwnedFile(stored)) return;
  const file = new File(resolveStoredUri(stored, documentDir()));
  if (file.exists) file.delete();
}

/** Writes `bytes` to `projects/<projectId>/<name>` and returns its stored URI. */
export function writeProjectFile(projectId: string, name: string, bytes: Uint8Array): string {
  const dir = new Directory(Paths.document, "projects", projectId);
  dir.create({ intermediates: true, idempotent: true });
  const file = new File(dir, name);
  file.write(bytes);
  return toStoredUri(file.uri, documentDir());
}
