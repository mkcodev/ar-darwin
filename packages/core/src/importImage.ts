import type { ImageSize } from "./models";

/** Longest side, in px, of an imported image. Bigger images are scaled down on import. */
export const MAX_IMAGE_SIDE = 4096;

/** Longest side, in px, of the thumbnail the library shows instead of the original. */
export const THUMB_MAX_SIDE = 512;

/** Longest project name taken from a file name. */
export const MAX_IMPORTED_NAME_LENGTH = 60;

export type ImportFormat = "png" | "jpeg";

/**
 * Size that fits `size` inside a `maxSide` square, keeping the aspect ratio: the longest side
 * becomes `maxSide` and the other is rounded, never below 1 px. Images that already fit come back
 * unchanged (never scaled up).
 */
export function fitWithinMaxSide(size: ImageSize, maxSide: number = MAX_IMAGE_SIDE): ImageSize {
  const { width, height } = size;
  if (!(width > 0 && height > 0 && maxSide > 0)) {
    throw new Error(`fitWithinMaxSide: invalid size ${width}×${height} or maxSide ${maxSide}`);
  }
  const longest = Math.max(width, height);
  if (longest <= maxSide) return { width, height };
  const ratio = maxSide / longest;
  return width >= height
    ? { width: maxSide, height: Math.max(1, Math.round(height * ratio)) }
    : { width: Math.max(1, Math.round(width * ratio)), height: maxSide };
}

/**
 * Format the imported image is saved in. PNG stays PNG (line art compresses well and may carry
 * transparency); everything else (JPEG, HEIC, WebP…) is saved as JPEG.
 */
export function importFormat(mimeType?: string | null): ImportFormat {
  return mimeType?.toLowerCase() === "image/png" ? "png" : "jpeg";
}

/** Folder of a project's files, relative to the document directory (see filePath.ts). */
export function projectDir(projectId: string): string {
  return `projects/${projectId}`;
}

/** Stored URI of the imported image of a project. */
export function projectSourcePath(projectId: string, format: ImportFormat): string {
  return `${projectDir(projectId)}/source.${format === "png" ? "png" : "jpg"}`;
}

/** Stored URI of a project's thumbnail. Derived from the id: not stored in the database. */
export function projectThumbPath(projectId: string): string {
  return `${projectDir(projectId)}/thumb.jpg`;
}

const EXTENSION = /\.[a-z0-9]{1,5}$/i;
/** Names cameras and screenshot tools give, which say nothing about the drawing. */
const GENERIC_NAMES = [
  /^(img|pxl|dsc[a-z]?|screenshot)([\s_-]|\d|$)/i,
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  /^[0-9a-f]{16,}$/i,
  /^[\d\s_.-]+$/,
];

/**
 * Project name from the picked file's name: without the extension, whitespace collapsed and cut
 * to `MAX_IMPORTED_NAME_LENGTH`. `null` when there is no name or it is a generic one (`IMG_1234`,
 * `PXL_…`, `DSC…`, `Screenshot…`, UUIDs, long hex, only digits): the app uses its default name.
 */
export function projectNameFromFileName(fileName?: string | null): string | null {
  if (fileName === undefined || fileName === null) return null;
  const name = fileName.trim().replace(EXTENSION, "").replace(/\s+/g, " ").trim();
  if (name.length === 0 || GENERIC_NAMES.some((pattern) => pattern.test(name))) return null;
  return name.slice(0, MAX_IMPORTED_NAME_LENGTH).trim();
}
