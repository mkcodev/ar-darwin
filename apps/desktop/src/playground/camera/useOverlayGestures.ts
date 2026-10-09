import {
  fitTransform,
  type NudgeAction,
  type NudgeStep,
  nudge,
  type Size,
  type SnapGuide,
  type SnapMode,
  snapTransform,
  type Transform,
} from "@ar-darwin/core";
import { signature, spring } from "@ar-darwin/ui";
import { animate } from "motion/react";
import { type PointerEvent, type RefObject, useCallback, useEffect, useRef } from "react";
import { springPlan } from "../../theme/transitions";
import { ARTWORK_SIZE } from "./demoArtwork";

export type Point = { x: number; y: number };
export type GuideState = { guides: SnapGuide[]; contact: Point };

type Options = {
  stage: RefObject<HTMLDivElement | null>;
  overlay: RefObject<HTMLDivElement | null>;
  contactRing: RefObject<HTMLDivElement | null>;
  size: Size | null;
  magnet: boolean;
  locked: boolean;
  reduce: boolean;
  /** Called only when the set of active guides changes, never per frame. */
  onGuides: (state: GuideState) => void;
  onTouchingChange: (touching: boolean) => void;
};

const W = ARTWORK_SIZE.width;
const H = ARTWORK_SIZE.height;

function initialTransform(size: Size): Transform {
  const fit = fitTransform(ARTWORK_SIZE, size);
  return { ...fit, scale: fit.scale * 0.74, x: fit.x + 18, y: fit.y + 36 };
}

const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

/**
 * Drag, pinch and wheel over the simulated camera, with the magnet from @ar-darwin/core.
 * The image is painted by writing `transform` on the DOM node: no React state per frame.
 * Following core's contract, the snapped transform is only for display while the gesture
 * runs, and it becomes the stored transform when the gesture ends.
 */
export function useOverlayGestures(o: Options) {
  const latest = useRef(o);
  latest.current = o;

  const raw = useRef<Transform | null>(null);
  const shown = useRef<Transform | null>(null);
  const guidesKey = useRef("");
  const pointers = useRef(new Map<number, Point>());
  const gesture = useRef<{ base: Transform; points: Point[] } | null>(null);
  const rect = useRef<DOMRect | null>(null);
  const wheelTimer = useRef<number | undefined>(undefined);

  const paint = useCallback((t: Transform) => {
    shown.current = t;
    const el = latest.current.overlay.current;
    if (!el) return;
    const sx = t.scale * (t.flipX ? -1 : 1);
    const sy = t.scale * (t.flipY ? -1 : 1);
    el.style.transform = `translate(${t.x - W / 2}px, ${t.y - H / 2}px) rotate(${t.rotation}deg) scale(${sx}, ${sy})`;
  }, []);

  const emitGuides = useCallback((guides: SnapGuide[], contact: Point) => {
    const key = guides.join(",");
    if (key === guidesKey.current) return;
    guidesKey.current = key;
    latest.current.onGuides({ guides, contact });
  }, []);

  const display = useCallback(
    (t: Transform, mode: SnapMode, contact: Point) => {
      const { size, magnet } = latest.current;
      if (!size || !magnet) {
        paint(t);
        emitGuides([], contact);
        return;
      }
      const result = snapTransform(t, ARTWORK_SIZE, size, { mode });
      paint(result.transform);
      emitGuides(result.activeGuides, contact);
    },
    [paint, emitGuides],
  );

  /** End of a gesture: the snapped transform is stored and the guides fade out. */
  const commit = useCallback(() => {
    if (shown.current) raw.current = shown.current;
    emitGuides([], { x: 0, y: 0 });
  }, [emitGuides]);

  // First layout: place the image once the viewport is measured.
  useEffect(() => {
    if (!o.size) return;
    if (!raw.current) raw.current = initialTransform(o.size);
    paint(raw.current);
  }, [o.size, paint]);

  const local = (e: { clientX: number; clientY: number }): Point => {
    const r = rect.current ?? latest.current.stage.current?.getBoundingClientRect();
    return { x: e.clientX - (r?.left ?? 0), y: e.clientY - (r?.top ?? 0) };
  };

  const rebase = () => {
    // The base is the unsnapped transform, or the image would stick to the guide (see core).
    if (!raw.current) return;
    gesture.current = { base: raw.current, points: [...pointers.current.values()] };
  };

  const ring = (p: Point | null) => {
    const el = latest.current.contactRing.current;
    if (!el) return;
    if (p) el.style.transform = `translate(${p.x}px, ${p.y}px)`;
    el.style.opacity = p ? "1" : "0";
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (latest.current.locked || !raw.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    rect.current = e.currentTarget.getBoundingClientRect();
    const p = local(e);
    pointers.current.set(e.pointerId, p);
    if (pointers.current.size === 1) latest.current.onTouchingChange(true);
    rebase();
    ring(p);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId) || !gesture.current) return;
    const p = local(e);
    pointers.current.set(e.pointerId, p);
    const { base, points } = gesture.current;
    const now = [...pointers.current.values()];
    const a0 = points[0];
    const a1 = now[0];
    if (!a0 || !a1) return;
    let next: Transform;
    if (now.length >= 2 && points.length >= 2) {
      const b0 = points[1] ?? a0;
      const b1 = now[1] ?? a1;
      const d0 = Math.hypot(b0.x - a0.x, b0.y - a0.y) || 1;
      const d1 = Math.hypot(b1.x - a1.x, b1.y - a1.y);
      const ang0 = Math.atan2(b0.y - a0.y, b0.x - a0.x);
      const ang1 = Math.atan2(b1.y - a1.y, b1.x - a1.x);
      next = {
        ...base,
        x: base.x + (a1.x + b1.x) / 2 - (a0.x + b0.x) / 2,
        y: base.y + (a1.y + b1.y) / 2 - (a0.y + b0.y) / 2,
        scale: base.scale * (d1 / d0),
        rotation: base.rotation + ((ang1 - ang0) * 180) / Math.PI,
      };
    } else {
      next = { ...base, x: base.x + a1.x - a0.x, y: base.y + a1.y - a0.y };
    }
    raw.current = next;
    ring(a1);
    display(next, "move", a1);
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.delete(e.pointerId)) return;
    if (pointers.current.size === 0) {
      gesture.current = null;
      ring(null);
      commit();
      latest.current.onTouchingChange(false);
    } else {
      rebase();
    }
  };

  // Wheel scales around the image centre (Shift rotates); passive: false to keep the page still.
  useEffect(() => {
    const el = o.stage.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const { locked } = latest.current;
      if (locked || !raw.current) return;
      e.preventDefault();
      const base = raw.current;
      const next = e.shiftKey
        ? { ...base, rotation: base.rotation + e.deltaY * 0.1 }
        : { ...base, scale: base.scale * Math.exp(-e.deltaY * 0.0015) };
      raw.current = next;
      display(next, e.shiftKey ? "move" : "scale", { x: next.x, y: next.y });
      window.clearTimeout(wheelTimer.current);
      wheelTimer.current = window.setTimeout(commit, signature.gestureSettleMs);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [o.stage, display, commit]);

  /** One fine-adjust step. Bypasses the magnet: 1 px moves must not snap back. */
  const nudgeBy = (action: NudgeAction, step: NudgeStep) => {
    const { size, locked, reduce } = latest.current;
    if (!raw.current || !size || locked) return;
    const from = shown.current ?? raw.current;
    const to = nudge(from, action, step, { base: fitTransform(ARTWORK_SIZE, size) });
    raw.current = to;
    if (action !== "reset") {
      paint(to);
      return;
    }
    // Reset glides back with `gentle`; reduced motion jumps.
    const plan = springPlan(spring.gentle, reduce);
    if (plan.mode !== "full") {
      paint(to);
      return;
    }
    animate(0, 1, {
      ...plan.transition,
      onUpdate: (p) =>
        paint({
          ...to,
          x: lerp(from.x, to.x, p),
          y: lerp(from.y, to.y, p),
          scale: lerp(from.scale, to.scale, p),
          rotation: lerp(from.rotation, to.rotation, p),
        }),
    });
  };

  const setFlip = (axis: "flipX" | "flipY", value: boolean) => {
    if (!raw.current) return;
    raw.current = { ...raw.current, [axis]: value };
    paint(raw.current);
  };

  return {
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp },
    nudgeBy,
    setFlip,
  };
}
