import { type SkImage, Skia } from "@shopify/react-native-skia";
import { useEffect, useState } from "react";
import { storedFileExists, storedFileUri } from "../storage/files";

export type ProjectImage =
  | { status: "loading" }
  | { status: "ready"; image: SkImage }
  | { status: "missing" };

/**
 * Decodes a project's image (a stored URI) for Skia. Not Skia's `useImage`: for a file that does
 * not exist its loader rejects without calling `onError`, so the camera would wait forever. Here
 * a missing file and one that doesn't decode both end as `missing`.
 */
export function useProjectImage(stored: string): ProjectImage {
  const [state, setState] = useState<ProjectImage>({ status: "loading" });

  useEffect(() => {
    let alive = true;
    setState({ status: "loading" });
    if (!storedFileExists(stored)) {
      setState({ status: "missing" });
      return;
    }
    Skia.Data.fromURI(storedFileUri(stored))
      .then((data) => {
        const image = Skia.Image.MakeImageFromEncoded(data);
        if (alive) setState(image ? { status: "ready", image } : { status: "missing" });
      })
      .catch((error: unknown) => {
        console.warn(`useProjectImage: could not load ${stored}`, error);
        if (alive) setState({ status: "missing" });
      });
    return () => {
      alive = false;
    };
  }, [stored]);

  return state;
}
