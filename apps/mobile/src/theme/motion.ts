import {
  type DurationToken,
  type Easing as EasingToken,
  type ReducedMotion,
  resolveMotion,
  type SpringToken,
  toReanimatedSpring,
} from "@ar-darwin/ui";
import { Easing, ReduceMotion, withSpring, withTiming } from "react-native-reanimated";

/**
 * What an animation should do under the motion preference (same contract as the web's
 * `apps/desktop/src/theme/transitions.ts`):
 * - "full": run the token (spring or tween) with transforms.
 * - "fade": skip transforms, only fade opacity for `duration`.
 * - "none": jump to the end state.
 * Plain data resolved on the JS thread at render, then captured by the worklets below.
 */
export type MotionPlan =
  | { mode: "full"; kind: "spring"; stiffness: number; damping: number; mass: number }
  | { mode: "full"; kind: "tween"; duration: number; easing: EasingToken }
  | { mode: "fade"; duration: number }
  | { mode: "none" };

function reducedPlan(r: ReducedMotion): MotionPlan {
  return r.kind === "fade" ? { mode: "fade", duration: r.duration } : { mode: "none" };
}

export function springPlan(token: SpringToken, reduce: boolean): MotionPlan {
  const r = resolveMotion(token, reduce);
  return r.kind === "full"
    ? { mode: "full", kind: "spring", ...toReanimatedSpring(r.token) }
    : reducedPlan(r);
}

export function tweenPlan(token: DurationToken, easing: EasingToken, reduce: boolean): MotionPlan {
  const r = resolveMotion(token, reduce);
  return r.kind === "full"
    ? { mode: "full", kind: "tween", duration: r.token.ms, easing }
    : reducedPlan(r);
}

type Done = (finished?: boolean) => void;

// These wrap Reanimated, so they live here and not in packages/core (which stays free of
// platform code). `ReduceMotion.Never`: the plan already applied the user's preference, and
// Reanimated's default (`System`) would otherwise skip the spring when the /dev/design override
// asks for full motion on a phone with «reduce motion» on.

/** A transform (position, scale, progress) under `plan`: the token when full, else a jump. */
export function animateMove(target: number, plan: MotionPlan, done?: Done): number {
  "worklet";
  if (plan.mode === "full" && plan.kind === "spring") {
    return withSpring(
      target,
      {
        stiffness: plan.stiffness,
        damping: plan.damping,
        mass: plan.mass,
        reduceMotion: ReduceMotion.Never,
      },
      done,
    );
  }
  if (plan.mode === "full") {
    const [x1, y1, x2, y2] = plan.easing;
    return withTiming(
      target,
      {
        duration: plan.duration,
        easing: Easing.bezier(x1, y1, x2, y2),
        reduceMotion: ReduceMotion.Never,
      },
      done,
    );
  }
  return withTiming(target, { duration: 0, reduceMotion: ReduceMotion.Never }, done);
}

/** Opacity alongside a plan: `fullMs` when full, the reduced fade, or a jump. */
export function animateFade(target: number, plan: MotionPlan, fullMs: number, done?: Done): number {
  "worklet";
  const ms = plan.mode === "full" ? fullMs : plan.mode === "fade" ? plan.duration : 0;
  return withTiming(target, { duration: ms, reduceMotion: ReduceMotion.Never }, done);
}
