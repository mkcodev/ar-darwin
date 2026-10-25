import { clamp } from "./controls";

/**
 * Zoom and pan of the splitter's preview. The content is the frame itself (width × height), drawn
 * as `translate(tx, ty) · scale(s)` from its top-left corner. Worklets: the gestures run on the
 * UI thread.
 */
export type PreviewView = { scale: number; tx: number; ty: number };

/** The identity view: no zoom. */
export const UNZOOMED_VIEW: PreviewView = { scale: 1, tx: 0, ty: 0 };

/** Keeps the zoomed content covering the frame: no empty margin shows. */
export function clampPreviewPan(
  view: PreviewView,
  frameWidth: number,
  frameHeight: number,
): PreviewView {
  "worklet";
  return {
    scale: view.scale,
    tx: clamp(view.tx, frameWidth * (1 - view.scale), 0),
    ty: clamp(view.ty, frameHeight * (1 - view.scale), 0),
  };
}

/**
 * Zooms to `nextScale` (kept within 1..maxScale) so the content point under the focus
 * (`focusX`, `focusY`, frame px) stays under it.
 */
export function zoomPreviewAt(
  view: PreviewView,
  nextScale: number,
  focusX: number,
  focusY: number,
  frameWidth: number,
  frameHeight: number,
  maxScale: number,
): PreviewView {
  "worklet";
  const scale = clamp(nextScale, 1, maxScale);
  const ratio = scale / view.scale;
  return clampPreviewPan(
    {
      scale,
      tx: focusX - (focusX - view.tx) * ratio,
      ty: focusY - (focusY - view.ty) * ratio,
    },
    frameWidth,
    frameHeight,
  );
}

/** Moves the view by `dx`, `dy` (frame px), within the frame. */
export function panPreview(
  view: PreviewView,
  dx: number,
  dy: number,
  frameWidth: number,
  frameHeight: number,
): PreviewView {
  "worklet";
  return clampPreviewPan(
    { scale: view.scale, tx: view.tx + dx, ty: view.ty + dy },
    frameWidth,
    frameHeight,
  );
}

/** The content point a touch at (`x`, `y`) in the frame lands on, undoing the zoom and pan. */
export function previewContentPoint(
  view: PreviewView,
  x: number,
  y: number,
): { x: number; y: number } {
  "worklet";
  return { x: (x - view.tx) / view.scale, y: (y - view.ty) / view.scale };
}

/** True once the view is zoomed in enough to be worth a reset button. */
export function isPreviewZoomed(view: PreviewView): boolean {
  "worklet";
  return view.scale > 1.001;
}
