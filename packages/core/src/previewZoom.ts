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
 * The view of a pinch that started on `start` with its fingers' centre at (`startFocusX`,
 * `startFocusY`) and has since scaled by `factor` with the centre now at (`focusX`, `focusY`): the
 * content point that was under the starting centre follows the fingers, so a two-finger drag
 * pans and a pinch zooms about the fingers, without double counting. Scale stays in 1..maxScale.
 */
export function pinchPreview(
  start: PreviewView,
  startFocusX: number,
  startFocusY: number,
  factor: number,
  focusX: number,
  focusY: number,
  frameWidth: number,
  frameHeight: number,
  maxScale: number,
): PreviewView {
  "worklet";
  const scale = clamp(start.scale * factor, 1, maxScale);
  const anchorX = (startFocusX - start.tx) / start.scale;
  const anchorY = (startFocusY - start.ty) / start.scale;
  return clampPreviewPan(
    { scale, tx: focusX - anchorX * scale, ty: focusY - anchorY * scale },
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
