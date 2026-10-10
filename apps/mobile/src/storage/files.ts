import { isAppOwnedFile, projectDir, resolveStoredUri, toStoredUri } from "@ar-darwin/core";
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

/** Absolute URI of a stored file, for components that show it (e.g. a thumbnail). */
export function storedFileUri(stored: string): string {
  return resolveStoredUri(stored, documentDir());
}

function projectDirectory(projectId: string): Directory {
  return new Directory(Paths.document, projectDir(projectId));
}

/** Writes `bytes` to `projects/<projectId>/<name>` and returns its stored URI. */
export function writeProjectFile(projectId: string, name: string, bytes: Uint8Array): string {
  const dir = projectDirectory(projectId);
  dir.create({ intermediates: true, idempotent: true });
  const file = new File(dir, name);
  file.write(bytes);
  return toStoredUri(file.uri, documentDir());
}

/**
 * Moves a temporary file (e.g. the image manipulator's output in the cache) to the stored path
 * `stored` (e.g. `projectThumbPath(id)`), creating its folder and replacing any file there.
 */
export async function moveToStored(uri: string, stored: string): Promise<string> {
  const target = new File(storedFileUri(stored));
  target.parentDirectory.create({ intermediates: true, idempotent: true });
  if (target.exists) target.delete();
  const file = new File(uri);
  await file.move(target);
  return toStoredUri(file.uri, documentDir());
}

/** Deletes `projects/<projectId>/` with everything in it (image, thumbnail…). */
export function deleteProjectDir(projectId: string): void {
  const dir = projectDirectory(projectId);
  if (dir.exists) dir.delete();
}
