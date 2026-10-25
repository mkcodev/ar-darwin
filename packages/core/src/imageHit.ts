import type { Size, Transform } from "./models";

/**
 * Whether a point of the canvas (px) falls on the overlay image. The image is drawn about its own
 * centre: the matrix is translate(x, y) · rotate · scale · translate(-w/2, -h/2), so the point is
 * taken back to the image's frame (undo the rotation and the scale) and compared with its half
 * size. Mirroring does not change the footprint. Used by the camera: a tap on the empty part of
 * the screen hides the menu, a tap on the image does not.
 */
export function pointInImage(
  point: { x: number; y: number },
  transform: Pick<Transform, "x" | "y" | "scale" | "rotation">,
  image: Size,
): boolean {
  if (!(transform.scale > 0) || !(image.width > 0) || !(image.height > 0)) return false;
  const radians = (-transform.rotation * Math.PI) / 180;
  const dx = point.x - transform.x;
  const dy = point.y - transform.y;
  const u = (dx * Math.cos(radians) - dy * Math.sin(radians)) / transform.scale;
  const v = (dx * Math.sin(radians) + dy * Math.cos(radians)) / transform.scale;
  return Math.abs(u) <= image.width / 2 && Math.abs(v) <= image.height / 2;
}
