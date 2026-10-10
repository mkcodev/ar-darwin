import type { IconName } from "@ar-darwin/ui";
import * as ImagePicker from "expo-image-picker";
import { t } from "../i18n";

/** What a source hands over: a local image the import pipeline can read. */
export type PickedImage = {
  uri: string;
  /** 0 when the system did not report it; the import measures the decoded image anyway. */
  width: number;
  height: number;
  mimeType?: string | null;
  fileName?: string | null;
};

export type PickResult = PickedImage | "cancelled" | "denied";

export type ImportSourceId = "gallery" | "camera";

/**
 * A place images come from. Adding one (e.g. files with expo-document-picker in the next native
 * rebuild) means adding an entry to `IMPORT_SOURCES` that returns a `PickedImage`; the sheet and
 * the import pipeline pick it up as is.
 */
export type ImportSource = {
  id: ImportSourceId;
  icon: IconName;
  label: () => string;
  pick: () => Promise<PickResult>;
};

/** The first asset of an image-picker result, or "cancelled". */
export function fromPickerResult(result: ImagePicker.ImagePickerResult): PickResult {
  const asset = result.canceled ? undefined : result.assets[0];
  if (asset === undefined) return "cancelled";
  return {
    uri: asset.uri,
    width: asset.width,
    height: asset.height,
    mimeType: asset.mimeType,
    fileName: asset.fileName,
  };
}

// quality 1 and no editing: the picker hands over the original and the import re-encodes once.
const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ["images"],
  allowsEditing: false,
  quality: 1,
  exif: false,
};

export const IMPORT_SOURCES: readonly ImportSource[] = [
  {
    id: "gallery",
    icon: "image",
    label: () => t("library.sources.gallery"),
    // The Android photo picker and iOS PHPicker need no library permission.
    pick: async () => fromPickerResult(await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS)),
  },
  {
    id: "camera",
    icon: "camera",
    label: () => t("library.sources.camera"),
    pick: async () => {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) return "denied";
      return fromPickerResult(await ImagePicker.launchCameraAsync(PICKER_OPTIONS));
    },
  },
];
