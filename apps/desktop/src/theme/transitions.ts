import {
  type DurationToken,
  type Easing,
  resolveMotion,
  type SpringToken,
  toMotionSpring,
} from "@ar-darwin/ui";
import type { Transition } from "motion/react";

/**
 * What an animation should do under the user's motion preference:
 * - "full": run the token (spring or tween) with transforms.
 * - "fade": skip transforms, only fade opacity for `transition`.
 * - "none": jump to the end state.
 */
export type MotionPlan = { mode: "full" | "fade" | "none"; transition: Transition };

const instant: Transition = { duration: 0 };

/** Motion wants a mutable 4-tuple for cubic-bezier easings. */
export function toMotionEase(e: Easing): [number, number, number, number] {
  return [e[0], e[1], e[2], e[3]];
}

function reducedPlan(r: { kind: "fade"; duration: number } | { kind: "none" }): MotionPlan {
  return r.kind === "fade"
    ? { mode: "fade", transition: { duration: r.duration / 1000, ease: "linear" } }
    : { mode: "none", transition: instant };
}

export function springPlan(token: SpringToken, reduce: boolean): MotionPlan {
  const r = resolveMotion(token, reduce);
  return r.kind === "full" ? { mode: "full", transition: toMotionSpring(r.token) } : reducedPlan(r);
}

export function tweenPlan(token: DurationToken, ease: Easing, reduce: boolean): MotionPlan {
  const r = resolveMotion(token, reduce);
  return r.kind === "full"
    ? { mode: "full", transition: { duration: r.token.ms / 1000, ease: toMotionEase(ease) } }
    : reducedPlan(r);
}

/** Transition for opacity alongside a plan: the plan's own timing, or a jump. */
export function opacityTransition(plan: MotionPlan, fallback: Transition): Transition {
  if (plan.mode === "none") return instant;
  if (plan.mode === "fade") return plan.transition;
  return fallback;
}
