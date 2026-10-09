/**
 * Single source of motion. Every token carries its reduced-motion equivalent: a short fade or
 * nothing. Only transform and opacity are ever animated.
 */

export type ReducedMotion = { kind: "fade"; duration: number } | { kind: "none" };

const fadeShort: ReducedMotion = { kind: "fade", duration: 120 };
const none: ReducedMotion = { kind: "none" };

export type DurationToken = { ms: number; reduced: ReducedMotion };

export const duration = {
  /** Colour or opacity swaps on hover. */
  instant: { ms: 90, reduced: none },
  /** Press, toggle, icon activation (120–180 ms band). */
  micro: { ms: 150, reduced: fadeShort },
  short: { ms: 220, reduced: fadeShort },
  /** Screen transitions and sheets (220–320 ms band). */
  medium: { ms: 280, reduced: fadeShort },
  long: { ms: 320, reduced: fadeShort },
} as const satisfies Record<string, DurationToken>;

/** cubic-bezier control points. */
export type Easing = readonly [number, number, number, number];

export const easing = {
  standard: [0.2, 0, 0, 1],
  enter: [0.05, 0.7, 0.1, 1],
  exit: [0.3, 0, 1, 1],
  /** Pencil stroke drawing itself: fast start, long settle. */
  draw: [0.2, 0.7, 0.2, 1],
} as const satisfies Record<string, Easing>;

export type SpringToken = {
  stiffness: number;
  damping: number;
  mass: number;
  reduced: ReducedMotion;
};

/** Damping ratio ζ = damping / (2·√(stiffness·mass)) noted on each spring. */
export const spring = {
  /** ζ ≈ 0.76. Magnet guide, toggles, registration: settles fast with a hint of bounce. */
  snappy: { stiffness: 420, damping: 31, mass: 1, reduced: fadeShort },
  /** ζ ≈ 0.92. Layout moves: splitter tiles, pills returning. */
  gentle: { stiffness: 170, damping: 24, mass: 1, reduced: fadeShort },
  /** ζ ≈ 0.93. Bottom sheet open, close and drag release. */
  sheet: { stiffness: 260, damping: 30, mass: 1, reduced: fadeShort },
  /** ζ ≈ 1.01. Screen transitions, e.g. fading to dark before the camera opens: no bounce. */
  screen: { stiffness: 220, damping: 30, mass: 1, reduced: fadeShort },
  /** ζ ≈ 0.49. Streak digits and status labels straightening: visible bounce, used sparingly. */
  playful: { stiffness: 300, damping: 17, mass: 1, reduced: none },
} as const satisfies Record<string, SpringToken>;

export type SpringName = keyof typeof spring;

/** Delay between items of a sequence (splitter tiles, labels). */
export const stagger = 40;

/** Timings of the signature moments, named so apps never hard-code them. */
export const signature = {
  /** Magnet guide fades out after the finger lifts. */
  guideFadeOutMs: 120,
  /** Camera menu retreats after this much idle time. */
  menuIdleMs: 3000,
  /** Distance the camera menu retreats while fading. */
  menuRetreatPx: 8,
  /** Ink press on the primary button must finish within this. */
  inkMaxMs: 180,
  /** Status labels start tilted by this many degrees and straighten with `playful`. */
  labelTiltDeg: 6,
  /** Status labels stay this long before fading out. */
  labelHoldMs: 1600,
  /** Wheel or pinch counts as finished (guides fade, transform is stored) after this pause. */
  gestureSettleMs: 280,
} as const;

export function dampingRatio(s: Pick<SpringToken, "stiffness" | "damping" | "mass">): number {
  return s.damping / (2 * Math.sqrt(s.stiffness * s.mass));
}

/** Config for Reanimated's withSpring. Mass is always explicit: Reanimated 4 defaults it to 4. */
export function toReanimatedSpring(s: SpringToken): {
  stiffness: number;
  damping: number;
  mass: number;
} {
  "worklet";
  return { stiffness: s.stiffness, damping: s.damping, mass: s.mass };
}

/** Transition for Motion (motion.dev): a physics-based spring. */
export function toMotionSpring(s: SpringToken): {
  type: "spring";
  stiffness: number;
  damping: number;
  mass: number;
} {
  return { type: "spring", stiffness: s.stiffness, damping: s.damping, mass: s.mass };
}

/** cubic-bezier() string for CSS or Motion's `ease`. */
export function toCssEasing(e: Easing): string {
  return `cubic-bezier(${e.join(", ")})`;
}

/**
 * Position of a spring going from 0 to 1, sampled every `stepMs` for `totalMs` (semi-implicit
 * Euler at 1 ms). Used to draw spring curves and to check overshoot in tests.
 */
export function sampleSpring(
  s: Pick<SpringToken, "stiffness" | "damping" | "mass">,
  totalMs: number,
  stepMs = 8,
): number[] {
  const out: number[] = [0];
  let x = 0;
  let v = 0;
  const h = 0.001;
  for (let t = 1; t <= totalMs; t++) {
    v += ((-s.stiffness * (x - 1) - s.damping * v) / s.mass) * h;
    x += v * h;
    if (t % stepMs === 0) out.push(x);
  }
  return out;
}

/** Milliseconds until a 0→1 spring stays within `tolerance` of 1. */
export function springSettleMs(
  s: Pick<SpringToken, "stiffness" | "damping" | "mass">,
  tolerance = 0.005,
): number {
  const samples = sampleSpring(s, 3000, 1);
  for (let i = samples.length - 1; i >= 0; i--) {
    if (Math.abs((samples[i] ?? 1) - 1) > tolerance) return i + 1;
  }
  return 0;
}

export type ResolvedMotion<T> = { kind: "full"; token: T } | ReducedMotion;

/** What to actually run: the token itself, or its reduced equivalent when the user asked for it. */
export function resolveMotion<T extends { reduced: ReducedMotion }>(
  token: T,
  reduceMotion: boolean,
): ResolvedMotion<T> {
  return reduceMotion ? token.reduced : { kind: "full", token };
}
