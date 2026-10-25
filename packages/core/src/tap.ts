/**
 * A tap is a touch that stays put: one finger, down and up, without drifting. Anything else (a
 * drag, a pinch, a rotation) is not a tap. The camera menu wakes only on a tap, so moving the
 * image while the menu is hidden never brings it back.
 */

/** A finger that drifts further than this (px) from where it came down is no longer a tap. */
export const TAP_SLOP_PX = 10;

export type TapState = { x: number; y: number; moved: boolean };

/**
 * A finger came down; `fingers` is how many are down now, this one included. The first finger
 * starts a tap; a second one means a pinch or a rotation, so the touch is not a tap any more.
 */
export function tapStart(state: TapState | null, x: number, y: number, fingers: number): TapState {
  if (state === null || fingers <= 1) return { x, y, moved: false };
  return { ...state, moved: true };
}

/** A finger moved. Past `slop` from where it came down, or with two fingers down, it is not a tap. */
export function tapMove(
  state: TapState | null,
  x: number,
  y: number,
  fingers: number,
  slop: number = TAP_SLOP_PX,
): TapState | null {
  if (state === null || state.moved) return state;
  if (fingers > 1 || Math.hypot(x - state.x, y - state.y) > slop) return { ...state, moved: true };
  return state;
}

/**
 * A finger lifted; `remaining` is how many are still down. `tapped` is true only when the last
 * finger lifted and the touch never moved or had a second finger.
 */
export function tapEnd(
  state: TapState | null,
  remaining: number,
): { state: TapState | null; tapped: boolean } {
  if (state === null) return { state: null, tapped: false };
  if (remaining > 0) return { state: { ...state, moved: true }, tapped: false };
  return { state: null, tapped: !state.moved };
}
