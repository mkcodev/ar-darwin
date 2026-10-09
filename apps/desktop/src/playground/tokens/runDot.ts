import type { useAnimate } from "motion/react";
import type { MotionPlan } from "../../theme/transitions";

type Scope = ReturnType<typeof useAnimate<HTMLDivElement>>[0];
type Animate = ReturnType<typeof useAnimate<HTMLDivElement>>[1];

/** Runs the card's dot along its track: travel with the token, fade in place, or jump. */
export function runDot(scope: Scope, animate: Animate, plan: MotionPlan): void {
  const dot = scope.current?.querySelector(".curve-dot");
  const track = scope.current?.querySelector(".curve-track");
  if (!(dot instanceof HTMLElement) || !(track instanceof HTMLElement)) return;
  const end = track.clientWidth - dot.offsetWidth;
  if (plan.mode === "full") animate(dot, { x: [0, end], opacity: 1 }, plan.transition);
  else if (plan.mode === "fade") animate(dot, { x: end, opacity: [0, 1] }, plan.transition);
  else animate(dot, { x: end, opacity: 1 }, { duration: 0 });
}
