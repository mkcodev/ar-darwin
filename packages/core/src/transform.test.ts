import { describe, expect, it } from "vitest";
import { IDENTITY_TRANSFORM, MIN_SCALE, type Transform } from "./models";
import {
  applyGesture,
  fitTransform,
  NUDGE_STEPS,
  type NudgeAction,
  type NudgeStep,
  nudge,
  ROTATION_DEAD_ZONE_DEGREES,
  rotationDeadZone,
  snapTransform,
} from "./transform";

const VIEWPORT = { width: 400, height: 800 };
/** At scale 1 and rotation 0: half width 50, half height 25. */
const IMAGE = { width: 100, height: 50 };

function transform(patch: Partial<Transform>): Transform {
  return Object.freeze({ ...IDENTITY_TRANSFORM, ...patch });
}

describe("snapTransform · move", () => {
  // y = 300 keeps the image away from every horizontal guide (0, 400, 800).
  it.each([
    ["left", { x: 55, y: 300 }, { x: 50, y: 300 }],
    ["centerX", { x: 203, y: 300 }, { x: 200, y: 300 }],
    ["right", { x: 347, y: 300 }, { x: 350, y: 300 }],
    ["top", { x: 100, y: 28 }, { x: 100, y: 25 }],
    ["centerY", { x: 100, y: 405 }, { x: 100, y: 400 }],
    ["bottom", { x: 100, y: 770 }, { x: 100, y: 775 }],
  ] as const)("snaps to the %s guide", (guide, from, to) => {
    const result = snapTransform(transform(from), IMAGE, VIEWPORT);
    expect(result.transform).toEqual(transform(to));
    expect(result.activeGuides).toEqual([guide]);
  });

  it("snaps both axes independently", () => {
    // Left edge 2 px from 0, bottom edge 4 px from 800.
    const both = snapTransform(transform({ x: 52, y: 771 }), IMAGE, VIEWPORT);
    expect(both.transform).toMatchObject({ x: 50, y: 775 });
    expect(both.activeGuides).toEqual(["left", "bottom"]);
  });

  it("snaps only below the threshold (strict)", () => {
    // Left edge at 7.5 px: snaps. At exactly 8 px: does not.
    expect(snapTransform(transform({ x: 57.5, y: 300 }), IMAGE, VIEWPORT).transform.x).toBe(50);
    const exact = snapTransform(transform({ x: 58, y: 300 }), IMAGE, VIEWPORT);
    expect(exact.transform.x).toBe(58);
    expect(exact.activeGuides).toEqual([]);
  });

  it("leaves the transform as is when nothing is near a guide", () => {
    const input = transform({ x: 100, y: 300, scale: 1.3, rotation: 20, flipX: true });
    const result = snapTransform(input, IMAGE, VIEWPORT);
    expect(result.transform).toEqual(input);
    expect(result.activeGuides).toEqual([]);
  });

  it("picks the closest feature on an axis", () => {
    // Width 396: left edge 5 px from 0, center 3 px from 200, right edge 1 px from 400.
    const result = snapTransform(
      transform({ x: 203, y: 300 }),
      { width: 396, height: 50 },
      VIEWPORT,
    );
    expect(result.transform.x).toBe(202);
    expect(result.activeGuides).toEqual(["right"]);
  });

  it("reports every guide that lines up after snapping", () => {
    const result = snapTransform(
      transform({ x: 203, y: 300 }),
      { width: 400, height: 50 },
      VIEWPORT,
    );
    expect(result.transform.x).toBe(200);
    expect(result.activeGuides).toEqual(["left", "centerX", "right"]);
  });

  it("uses the bounding box of the rotated image", () => {
    // Rotated 90°: 50 wide, 100 tall → left edge at x − 25.
    const result = snapTransform(transform({ x: 28, y: 300, rotation: 90 }), IMAGE, VIEWPORT);
    expect(result.transform.x).toBe(25);
    expect(result.activeGuides).toEqual(["left"]);
  });

  it("scales the bounding box with the transform", () => {
    // Scale 2: half width 100 → left edge on 0 and, with it, right edge on 200.
    const result = snapTransform(transform({ x: 104, y: 300, scale: 2 }), IMAGE, VIEWPORT);
    expect(result.transform.x).toBe(100);
    expect(result.activeGuides).toEqual(["left", "centerX"]);
  });

  it("is disabled with threshold 0, even when already aligned", () => {
    const input = transform({ x: 50, y: 300, rotation: 45 });
    const result = snapTransform(input, IMAGE, VIEWPORT, { threshold: 0, rotationThreshold: 0 });
    expect(result.transform).toEqual(input);
    expect(result.activeGuides).toEqual([]);
  });

  it("does not touch scale or flips", () => {
    const input = transform({ x: 55, y: 300, flipX: true, flipY: true });
    expect(snapTransform(input, IMAGE, VIEWPORT).transform).toMatchObject({
      scale: 1,
      flipX: true,
      flipY: true,
    });
  });
});

describe("snapTransform · rotation", () => {
  // x = 100, y = 300 keeps the rotated image away from every position guide.
  it.each([
    [43, 45],
    [47, 45],
    [-44, -45],
    [88, 90],
    [362, 0],
    [179, 180],
    [-178, 180],
  ])("snaps %d° to %d°", (from, to) => {
    const result = snapTransform(transform({ x: 100, y: 300, rotation: from }), IMAGE, VIEWPORT);
    expect(result.transform.rotation).toBe(to);
  });

  it.each([
    [41, 41],
    [42, 42],
    [20, 20],
    [365, 5],
    [-190, 170],
  ])("leaves %d° as %d° (normalized, not snapped)", (from, to) => {
    const result = snapTransform(transform({ x: 100, y: 300, rotation: from }), IMAGE, VIEWPORT);
    expect(result.transform.rotation).toBe(to);
  });

  it("honours a custom rotation threshold", () => {
    const input = transform({ x: 100, y: 300, rotation: 40 });
    expect(snapTransform(input, IMAGE, VIEWPORT, { rotationThreshold: 6 }).transform.rotation).toBe(
      45,
    );
  });
});

describe("snapTransform · scale", () => {
  it("defaults to move mode", () => {
    const input = transform({ x: 200, y: 600, scale: 3.95 });
    expect(snapTransform(input, IMAGE, VIEWPORT).transform.scale).toBe(3.95);
  });

  it("snaps to the viewport width, keeping the center", () => {
    // Scale 3.95: half width 98.75 → edges at 2.5 and 397.5.
    const input = transform({ x: 200, y: 600, scale: 3.95 });
    const result = snapTransform(input, IMAGE, VIEWPORT, { mode: "scale" });
    expect(result.transform).toEqual(transform({ x: 200, y: 600, scale: 4 }));
    expect(result.activeGuides).toEqual(["left", "right"]);
  });

  it("snaps to the viewport height, keeping the center", () => {
    // Scale 15.9: half height 397.5 → edges at 2.5 and 797.5.
    const input = transform({ x: 200, y: 400, scale: 15.9 });
    const result = snapTransform(input, IMAGE, VIEWPORT, { mode: "scale" });
    expect(result.transform).toEqual(transform({ x: 200, y: 400, scale: 16 }));
    expect(result.activeGuides).toEqual(["top", "bottom"]);
  });

  it("never changes x, y or a rotation that is not near 45°", () => {
    const input = transform({ x: 200, y: 600, scale: 3.95, rotation: 10, flipY: true });
    const { transform: out } = snapTransform(input, IMAGE, VIEWPORT, { mode: "scale" });
    expect(out).toMatchObject({ x: 200, y: 600, rotation: 10, flipY: true });
  });

  it("snaps only below the threshold (strict)", () => {
    const image = { width: 64, height: 32 };
    // Scale 6.0625: half width 194 → left edge 6 px from 0 → snaps to 200 / 32.
    const near = snapTransform(transform({ x: 200, y: 600, scale: 6.0625 }), image, VIEWPORT, {
      mode: "scale",
    });
    expect(near.transform.scale).toBe(6.25);
    // Scale 6: half width 192 → left edge exactly 8 px from 0 → no snap.
    const exact = snapTransform(transform({ x: 200, y: 600, scale: 6 }), image, VIEWPORT, {
      mode: "scale",
    });
    expect(exact.transform.scale).toBe(6);
    expect(exact.activeGuides).toEqual([]);
  });

  it("picks the closest edge across both axes", () => {
    // Square 100, scale 2.9: left edge 5 px from 0, bottom edge 2 px from 800 → bottom wins.
    const input = transform({ x: 150, y: 653, scale: 2.9 });
    const result = snapTransform(input, { width: 100, height: 100 }, VIEWPORT, { mode: "scale" });
    expect(result.transform.scale).toBeCloseTo(2.94, 10);
    expect(result.activeGuides).toEqual(["bottom"]);
  });

  it("ignores snaps that would need a scale below MIN_SCALE", () => {
    // Center 1 px from the left guide: fitting the edge there would need scale 0.02.
    const input = transform({ x: 1, y: 600, scale: 0.1 });
    const result = snapTransform(input, { width: 100, height: 100 }, VIEWPORT, { mode: "scale" });
    expect(result.transform.scale).toBe(0.1);
    expect(result.activeGuides).toEqual([]);
    expect(MIN_SCALE).toBe(0.05);
  });
});

describe("nudge", () => {
  const start = transform({ x: 100, y: 200, scale: 2, rotation: 10, flipX: true });

  it.each([
    ["moveUp", "fine", { y: 199 }],
    ["moveUp", "coarse", { y: 190 }],
    ["moveDown", "fine", { y: 201 }],
    ["moveDown", "coarse", { y: 210 }],
    ["moveLeft", "fine", { x: 99 }],
    ["moveLeft", "coarse", { x: 90 }],
    ["moveRight", "fine", { x: 101 }],
    ["moveRight", "coarse", { x: 110 }],
    ["rotateCw", "fine", { rotation: 11 }],
    ["rotateCw", "coarse", { rotation: 15 }],
    ["rotateCcw", "fine", { rotation: 9 }],
    ["rotateCcw", "coarse", { rotation: 5 }],
  ] as const)("%s %s", (action, step, patch) => {
    expect(nudge(start, action, step)).toEqual({ ...start, ...patch });
  });

  it.each([
    ["scaleUp", "fine", 2.02],
    ["scaleUp", "coarse", 2.1],
    ["scaleDown", "fine", 2 / 1.01],
    ["scaleDown", "coarse", 2 / 1.05],
  ] as const)("%s %s", (action, step, scale) => {
    const out = nudge(start, action, step);
    expect(out.scale).toBeCloseTo(scale, 10);
    expect({ ...out, scale: 0 }).toEqual({ ...start, scale: 0 });
  });

  it("exposes the default steps", () => {
    expect(NUDGE_STEPS).toEqual({
      fine: { move: 1, scale: 0.01, rotate: 1 },
      coarse: { move: 10, scale: 0.05, rotate: 5 },
    });
  });

  it("undoes scaleUp with scaleDown", () => {
    for (const step of ["fine", "coarse"] satisfies NudgeStep[]) {
      expect(nudge(nudge(start, "scaleUp", step), "scaleDown", step).scale).toBeCloseTo(2, 10);
    }
  });

  it("never scales below MIN_SCALE", () => {
    let t = transform({ scale: 0.06 });
    for (let i = 0; i < 20; i++) t = nudge(t, "scaleDown", "coarse");
    expect(t.scale).toBe(MIN_SCALE);
  });

  it("never grows on scaleDown when already below MIN_SCALE", () => {
    // fitTransform on a 20000 px image in a 400 px viewport gives scale 0.02.
    const tiny = fitTransform({ width: 20000, height: 10000 }, VIEWPORT);
    expect(tiny.scale).toBe(0.02);
    expect(nudge(tiny, "scaleDown", "fine").scale).toBe(0.02);
    expect(nudge(tiny, "scaleDown", "coarse").scale).toBe(0.02);
  });

  it.each([
    [179, "rotateCw", "coarse", -176],
    [-178, "rotateCcw", "coarse", 177],
    [364, "rotateCw", "fine", 5],
    [-189, "rotateCcw", "fine", 170],
    [179, "rotateCw", "fine", 180],
  ] as const)("normalizes %d° %s %s to %d°", (rotation, action, step, expected) => {
    expect(nudge(transform({ rotation }), action, step).rotation).toBe(expected);
  });

  it("resets to the identity, keeping the mirror", () => {
    const steps: NudgeStep[] = ["fine", "coarse"];
    for (const step of steps) {
      expect(nudge(start, "reset", step)).toEqual({ ...IDENTITY_TRANSFORM, flipX: true });
    }
  });

  it("resets to a given base, keeping the current mirror", () => {
    const base = transform({ x: 200, y: 400, scale: 4, rotation: 370, flipY: true });
    expect(nudge(start, "reset", "fine", { base })).toEqual({
      x: 200,
      y: 400,
      scale: 4,
      rotation: 10,
      flipX: true,
      flipY: false,
    });
  });

  it("returns a new object and never mutates the input", () => {
    const actions: NudgeAction[] = ["moveUp", "scaleUp", "rotateCw", "reset"];
    for (const action of actions) {
      const out = nudge(start, action, "fine");
      expect(out).not.toBe(start);
    }
    expect(start).toEqual(transform({ x: 100, y: 200, scale: 2, rotation: 10, flipX: true }));
  });
});

describe("fitTransform", () => {
  it.each([
    ["wide", { width: 1000, height: 500 }, 0.4],
    ["tall", { width: 100, height: 400 }, 2],
    ["same ratio", { width: 200, height: 400 }, 2],
  ])("centers a %s image and fits it inside the viewport", (_label, image, scale) => {
    expect(fitTransform(image, VIEWPORT)).toEqual({
      x: 200,
      y: 400,
      scale,
      rotation: 0,
      flipX: false,
      flipY: false,
    });
  });

  it("works as the reset base for nudge", () => {
    const base = fitTransform({ width: 1000, height: 500 }, VIEWPORT);
    const moved = nudge(nudge(base, "moveLeft", "coarse"), "scaleUp", "coarse");
    expect(nudge(moved, "reset", "fine", { base })).toEqual(base);
  });
});

describe("rotationDeadZone", () => {
  it("absorbs anything inside the zone", () => {
    expect(rotationDeadZone(0)).toBe(0);
    expect(rotationDeadZone(3)).toBe(0);
    expect(rotationDeadZone(-3)).toBe(0);
    expect(rotationDeadZone(ROTATION_DEAD_ZONE_DEGREES)).toBe(0);
  });

  it("is continuous right past the edge", () => {
    expect(rotationDeadZone(ROTATION_DEAD_ZONE_DEGREES + 0.001)).toBeCloseTo(0.001, 10);
    expect(rotationDeadZone(-(ROTATION_DEAD_ZONE_DEGREES + 0.001))).toBeCloseTo(-0.001, 10);
  });

  it.each([
    [10, 6],
    [-10, -6],
  ])("subtracts the zone outside it: %d° -> %d°", (accumulated, expected) => {
    expect(rotationDeadZone(accumulated)).toBe(expected);
  });

  it("honours a custom zone", () => {
    expect(rotationDeadZone(5, 10)).toBe(0);
    expect(rotationDeadZone(12, 10)).toBe(2);
  });
});

describe("applyGesture", () => {
  const FOCAL = { focalX: 50, focalY: 50 };
  const IDENTITY_STEP = { changeX: 0, changeY: 0, scaleChange: 1, rotationChange: 0, ...FOCAL };

  it("is a no-op with an identity step", () => {
    const t = transform({ x: 12, y: 34, scale: 1.5, rotation: 20 });
    expect(applyGesture(t, IDENTITY_STEP)).toEqual(t);
  });

  it("pans by changeX/changeY regardless of the focal point", () => {
    const t = transform({ x: 100, y: 200 });
    const result = applyGesture(t, { ...IDENTITY_STEP, changeX: 10, changeY: -5 });
    expect(result).toEqual(transform({ x: 110, y: 195 }));
  });

  it("scales around the focal point: the point under the fingers does not move", () => {
    const t = transform({ x: 50, y: 50 }); // the focal point itself
    const result = applyGesture(t, { ...IDENTITY_STEP, scaleChange: 2 });
    expect(result).toEqual(transform({ x: 50, y: 50, scale: 2 }));
  });

  it("scales a point away from the focal, doubling its offset", () => {
    const t = transform({ x: 150, y: 50 }); // 100 px to the right of the focal
    const result = applyGesture(t, { ...IDENTITY_STEP, scaleChange: 2 });
    expect(result).toEqual(transform({ x: 250, y: 50, scale: 2 }));
  });

  it("clamps scale at MIN_SCALE, same floor as nudge", () => {
    const t = transform({ x: 50, y: 50, scale: 0.06 });
    const result = applyGesture(t, { ...IDENTITY_STEP, scaleChange: 0.1 });
    expect(result.scale).toBe(MIN_SCALE);
  });

  it("rotates 90° around the focal point (clockwise, y axis down)", () => {
    const t = transform({ x: 150, y: 50 }); // 100 px to the right of the focal
    const result = applyGesture(t, { ...IDENTITY_STEP, rotationChange: 90 });
    expect(result.x).toBeCloseTo(50, 10);
    expect(result.y).toBeCloseTo(150, 10);
    expect(result.rotation).toBe(90);
  });

  it("composes pan, scale and rotation in one step", () => {
    const t = transform({ x: 150, y: 50, scale: 1, rotation: 10 });
    const result = applyGesture(t, {
      changeX: 5,
      changeY: 5,
      scaleChange: 2,
      rotationChange: 90,
      ...FOCAL,
    });
    expect(result.x).toBeCloseTo(55, 10);
    expect(result.y).toBeCloseTo(255, 10);
    expect(result.scale).toBe(2);
    expect(result.rotation).toBe(100);
  });

  it("leaves flips untouched", () => {
    const t = transform({ x: 50, y: 50, flipX: true, flipY: true });
    const result = applyGesture(t, { ...IDENTITY_STEP, scaleChange: 1.5, rotationChange: 30 });
    expect(result).toMatchObject({ flipX: true, flipY: true });
  });

  it("never mutates the input", () => {
    const t = transform({ x: 50, y: 50 });
    applyGesture(t, { ...IDENTITY_STEP, changeX: 10, scaleChange: 2, rotationChange: 45 });
    expect(t).toEqual(transform({ x: 50, y: 50 }));
  });
});
