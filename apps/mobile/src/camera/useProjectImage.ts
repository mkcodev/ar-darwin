import { type SkImage, Skia } from "@shopify/react-native-skia";
import { useEffect, useState } from "react";
import { storedFileExists, storedFileUri } from "../storage/files";

export type ProjectImage =
  | { status: "loading" }
  | { status: "ready"; image: SkImage }
  | { status: "missing" };

/**
 * How long an image waits after its screen unmounts before `dispose()`. Disposing it while the
 * Canvas can still draw it throws ("Attempted to access a disposed object") on the UI thread; by
 * then the Canvas that showed it is gone and no frame can be using it.
 */
const DISPOSE_DELAY_MS = 1000;

/**
 * Decodes a project's image (a stored URI) for Skia. Not Skia's `useImage`: for a file that does
 * not exist its loader rejects without calling `onError`, so the camera would wait forever. Here
 * a missing file and one that doesn't decode both end as `missing`.
 *
 * Memory: a 4096 px image is tens of MB of native and GPU memory, and Hermes's GC doesn't see
 * that weight, so leaving it to the GC let every camera visit pile up. The encoded bytes are
 * released as soon as the image exists, the image `DISPOSE_DELAY_MS` after the screen goes (or at
 * once if it decoded after the screen had already gone: it was never drawn).
 */
export function useProjectImage(stored: string): ProjectImage {
  const [state, setState] = useState<ProjectImage>({ status: "loading" });

  useEffect(() => {
    let alive = true;
    let decoded: SkImage | null = null;
    setState({ status: "loading" });
    if (!storedFileExists(stored)) {
      setState({ status: "missing" });
      return;
    }
    Skia.Data.fromURI(storedFileUri(stored))
      .then((data) => {
        let image: SkImage | null;
        try {
          image = Skia.Image.MakeImageFromEncoded(data);
        } finally {
          // The image decodes lazily but holds its own reference to the bytes: only the JS
          // wrapper goes here.
          data.dispose();
        }
        if (!alive) {
          image?.dispose();
          return;
        }
        decoded = image;
        setState(image ? { status: "ready", image } : { status: "missing" });
      })
      .catch((error: unknown) => {
        console.warn(`useProjectImage: could not load ${stored}`, error);
        if (alive) setState({ status: "missing" });
      });
    return () => {
      alive = false;
      const image = decoded;
      if (image) setTimeout(() => image.dispose(), DISPOSE_DELAY_MS);
    };
  }, [stored]);

  return state;
}
