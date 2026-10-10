import {
  createProject,
  createProjectId,
  fitWithinMaxSide,
  type ImportFormat,
  importFormat,
  MAX_IMAGE_SIDE,
  type Project,
  projectNameFromFileName,
  projectSourcePath,
  projectThumbPath,
  THUMB_MAX_SIDE,
} from "@ar-darwin/core";
import { opacity } from "@ar-darwin/ui";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import type { SQLiteDatabase } from "expo-sqlite";
import { locale, t } from "../i18n";
import { deleteProjectDir, moveToStored } from "../storage/files";
import { saveProject } from "../storage/projectRepository";
import type { PickedImage } from "./importSources";

const SOURCE_JPEG_QUALITY = 0.92;
const THUMB_JPEG_QUALITY = 0.8;

const saveFormat: Record<ImportFormat, SaveFormat> = {
  png: SaveFormat.PNG,
  jpeg: SaveFormat.JPEG,
};

function defaultName(now: Date): string {
  return t("library.defaultName", {
    date: now.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" }),
  });
}

/**
 * Turns a picked image into a saved project:
 * 1. Decode it once with expo-image-manipulator. The image is always re-encoded, even when it
 *    already fits: that applies the EXIF orientation, drops EXIF (GPS included) and turns HEIC or
 *    WebP into JPEG. PNG stays PNG (lossless; line art and transparency).
 * 2. Scale it down to `MAX_IMAGE_SIDE` on the longest side if needed, measured on the decoded
 *    image (the picker can report 0 × 0).
 * 3. Save it and a `THUMB_MAX_SIDE` JPEG thumbnail into `projects/<id>/`, then the row.
 * If anything fails after the folder exists, the folder goes too: no half-imported projects.
 */
export async function importProject(
  db: SQLiteDatabase,
  picked: PickedImage,
  now: Date = new Date(),
): Promise<Project> {
  const id = createProjectId();
  const format = importFormat(picked.mimeType);
  const decoded = await ImageManipulator.manipulate(picked.uri).renderAsync();
  const refs = [decoded];
  try {
    const size = { width: decoded.width, height: decoded.height };
    const target = fitWithinMaxSide(size, MAX_IMAGE_SIDE);
    const source =
      target.width === size.width && target.height === size.height
        ? decoded
        : await ImageManipulator.manipulate(decoded).resize(target).renderAsync();
    if (source !== decoded) refs.push(source);
    const thumb = await ImageManipulator.manipulate(source)
      .resize(fitWithinMaxSide(target, THUMB_MAX_SIDE))
      .renderAsync();
    refs.push(thumb);

    const [sourceFile, thumbFile] = await Promise.all([
      source.saveAsync({
        format: saveFormat[format],
        compress: format === "jpeg" ? SOURCE_JPEG_QUALITY : 1,
      }),
      thumb.saveAsync({ format: SaveFormat.JPEG, compress: THUMB_JPEG_QUALITY }),
    ]);

    try {
      const sourceUri = await moveToStored(sourceFile.uri, projectSourcePath(id, format));
      await moveToStored(thumbFile.uri, projectThumbPath(id));
      const project = createProject({
        id,
        name: projectNameFromFileName(picked.fileName) ?? defaultName(now),
        sourceUri,
        opacity: opacity.overlayImage,
        now,
      });
      return await saveProject(db, project, now);
    } catch (error) {
      try {
        deleteProjectDir(id);
      } catch (cleanup) {
        console.warn(`importProject: could not clean up project ${id}`, cleanup);
      }
      throw error;
    }
  } finally {
    for (const ref of refs) ref.release();
  }
}
