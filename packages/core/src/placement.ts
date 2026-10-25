import type { Placement } from "./models";
import { normalizeRotation, restoreTransform } from "./transform";

/** How close two placements must be to count as the same one. */
export const SAME_PLACEMENT = {
  /** Canvas px. */
  movePx: 0.5,
  /** Relative: 0.001 = 0.1 % apart. */
  scale: 0.001,
  /** Degrees. */
  rotation: 0.1,
} as const;

/**
 * Whether two placements put the image in the same place: `b` is first moved onto `a`'s canvas
 * (`restoreTransform`), then position, scale and rotation are compared within `SAME_PLACEMENT`.
 * Mirrors are ignored, like the pin ignores them. The camera asks which placement to open with
 * only when the last one and the pinned one differ.
 */
export function samePlacement(a: Placement, b: Placement): boolean {
  const other = restoreTransform(b.transform, b.viewport, a.viewport);
  const t = a.transform;
  return (
    Math.abs(t.x - other.x) <= SAME_PLACEMENT.movePx &&
    Math.abs(t.y - other.y) <= SAME_PLACEMENT.movePx &&
    Math.abs(t.scale - other.scale) <= SAME_PLACEMENT.scale * Math.max(t.scale, other.scale) &&
    Math.abs(normalizeRotation(t.rotation - other.rotation)) <= SAME_PLACEMENT.rotation
  );
}
