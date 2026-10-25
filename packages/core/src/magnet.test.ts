import { describe, expect, it } from "vitest";
import { magnetEngaged, magnetize, NO_MAGNET_LOCK, DEFAULT_MAGNET_OPTIONS as O } from "./magnet";
import type { Size, Transform } from "./models";

// Every threshold below comes from DEFAULT_MAGNET_OPTIONS, so tuning them by feel does not break
// these tests: only their relations do (grab < let go, strict comparisons).

const VIEWPORT: Size = { width: 400, height: 800 };
const ON_AXES = { x: 200, y: 400 };

const at = (patch: Partial<Transform>): Transform => ({
  x: 100,
  y: 100,
  scale: 1,
  rotation: 0,
  flipX: false,
  flipY: false,
  ...patch,
});

const run = (raw: Transform, prev = NO_MAGNET_LOCK, pin: Transform | null = null) =>
  magnetize(raw, prev, VIEWPORT, pin);

describe("thresholds", () => {
  it("always let go farther than they grab", () => {
    expect(O.exit).toBeGreaterThan(O.enter);
    expect(O.rotationExit).toBeGreaterThan(O.rotationEnter);
    expect(O.pinExit).toBeGreaterThan(O.pinEnter);
    expect(O.pinScaleExit).toBeGreaterThan(O.pinScaleEnter);
    expect(O.pinRotationExit).toBeGreaterThan(O.pinRotationEnter);
  });
});

describe("magnetize: axes", () => {
  it("grabs the center onto the vertical axis inside the enter threshold", () => {
    const { transform, lock } = run(at({ x: 200 + O.enter - 1 }));
    expect(transform.x).toBe(200);
    expect(lock.axisX).toBe(true);
  });

  it("leaves it alone at the enter threshold (strict) and beyond", () => {
    const edge = 200 + O.enter;
    expect(run(at({ x: edge })).transform.x).toBe(edge);
    expect(run(at({ x: edge })).lock.axisX).toBe(false);
    expect(run(at({ x: 200 - O.enter })).lock.axisX).toBe(false);
  });

  it("snaps both axes independently", () => {
    const both = run(at({ x: 200 - (O.enter - 1), y: 400 + (O.enter - 2) }));
    expect(both.transform).toMatchObject(ON_AXES);
    expect(both.lock).toMatchObject({ axisX: true, axisY: true });
    const onlyY = run(at({ x: 100, y: 400 + (O.enter - 2) }));
    expect(onlyY.transform).toMatchObject({ x: 100, y: 400 });
    expect(onlyY.lock).toMatchObject({ axisX: false, axisY: true });
  });

  it("holds until the exit threshold once grabbed (hysteresis)", () => {
    const grabbed = { ...NO_MAGNET_LOCK, axisX: true };
    const inside = 200 + O.exit - 0.1;
    expect(run(at({ x: inside }), grabbed).lock.axisX).toBe(true);
    expect(run(at({ x: inside }), grabbed).transform.x).toBe(200);
    const edge = 200 + O.exit;
    expect(run(at({ x: edge }), grabbed).lock.axisX).toBe(false);
    expect(run(at({ x: edge }), grabbed).transform.x).toBe(edge);
  });

  it("does not grab between the enter and the exit threshold when it was free", () => {
    expect(run(at({ x: 200 + O.exit - 1 })).lock.axisX).toBe(false);
  });

  it("works on whatever canvas it is given", () => {
    const wide = magnetize(
      at({ x: 500 + O.enter - 1 }),
      NO_MAGNET_LOCK,
      { width: 1000, height: 600 },
      null,
    );
    expect(wide.transform.x).toBe(500);
  });
});

describe("magnetize: rotation", () => {
  it.each([
    [0, 0],
    [1, 0],
    [89, 90],
    [91, 90],
    [-91, -90],
    [179, 180],
    [181, 180],
    [-179, 180],
    [359, 0],
    [361, 0],
    [721, 0],
    [-359, 0],
    [-721, 0],
    [450, 90],
  ])("%s° grabs onto %s°", (raw, snapped) => {
    const { transform, lock } = run(at({ rotation: raw }));
    expect(transform.rotation).toBe(snapped);
    expect(lock.rotation).toBe(true);
  });

  it.each([O.rotationEnter, 90 - O.rotationEnter, 90 + O.rotationEnter, 45, -45, 135])(
    "%s° is too far from a right angle",
    (raw) => {
      const { transform, lock } = run(at({ rotation: raw }));
      expect(lock.rotation).toBe(false);
      expect(transform.rotation).toBe(raw);
    },
  );

  it("holds up to the exit threshold, then lets go", () => {
    const grabbed = { ...NO_MAGNET_LOCK, rotation: true };
    const inside = O.rotationExit - 0.5;
    expect(run(at({ rotation: 90 + inside }), grabbed).transform.rotation).toBe(90);
    expect(run(at({ rotation: 90 + O.rotationExit }), grabbed).transform.rotation).toBe(
      90 + O.rotationExit,
    );
    expect(run(at({ rotation: inside }), grabbed).lock.rotation).toBe(true);
    expect(run(at({ rotation: O.rotationExit }), grabbed).lock.rotation).toBe(false);
  });

  it("never returns -0", () => {
    expect(Object.is(run(at({ rotation: -1 })).transform.rotation, 0)).toBe(true);
  });
});

describe("magnetize: mirror", () => {
  it("passes the flags through and snaps the same way", () => {
    const x = 200 + O.enter - 2;
    const flipped = run(at({ x, rotation: 89, flipX: true, flipY: true }));
    const plain = run(at({ x, rotation: 89 }));
    expect(flipped.transform).toMatchObject({ x: 200, rotation: 90, flipX: true, flipY: true });
    expect(flipped.lock).toEqual(plain.lock);
  });

  it("keeps scale untouched", () => {
    expect(run(at({ x: 200 + O.enter - 1, scale: 1.37 })).transform.scale).toBe(1.37);
  });
});

describe("magnetize: pin", () => {
  const pin = at({ x: 150, y: 250, scale: 0.8, rotation: 30 });
  const near = { dx: O.pinEnter * 0.5, dy: O.pinEnter * 0.4 };

  it("grabs the whole pinned transform when position, scale and rotation are close", () => {
    const raw = at({
      x: 150 + near.dx,
      y: 250 + near.dy,
      scale: 0.8 * (1 + O.pinScaleEnter * 0.5),
      rotation: 30 + O.pinRotationEnter * 0.5,
      flipX: true,
    });
    const { transform, lock } = run(raw, NO_MAGNET_LOCK, pin);
    expect(transform).toEqual({ ...pin, flipX: true });
    expect(lock).toEqual({ axisX: false, axisY: false, rotation: false, pin: true });
  });

  it("wins over the axes and the right angles when both would apply", () => {
    const nearAxis = at({ x: 200, y: 400, scale: 1, rotation: 90 });
    const pinOnAxis = at({ x: 200 + O.pinEnter * 0.5, y: 400 - O.pinEnter * 0.4, rotation: 89 });
    const { transform, lock } = run(nearAxis, NO_MAGNET_LOCK, pinOnAxis);
    expect(transform).toEqual(pinOnAxis);
    expect(lock.pin).toBe(true);
    expect(lock.axisX).toBe(false);
  });

  it("falls back to the axes when the pin is out of radius", () => {
    const { transform, lock } = run(
      at({ x: 200 + O.enter - 1, y: 100, scale: 0.8 }),
      NO_MAGNET_LOCK,
      pin,
    );
    expect(transform.x).toBe(200);
    expect(lock).toMatchObject({ axisX: true, pin: false });
  });

  it.each([
    ["position", at({ x: 150 + O.pinEnter + 1, y: 250, scale: 0.8, rotation: 30 })],
    ["scale", at({ x: 150, y: 250, scale: 0.8 * (1 + O.pinScaleEnter * 1.5), rotation: 30 })],
    ["rotation", at({ x: 150, y: 250, scale: 0.8, rotation: 30 + O.pinRotationEnter + 1 })],
  ])("does not grab when only the %s is off", (_what, raw) => {
    expect(run(raw, NO_MAGNET_LOCK, pin).lock.pin).toBe(false);
  });

  it("holds until the exit radius, on each magnitude", () => {
    const held = { ...NO_MAGNET_LOCK, pin: true };
    const at150 = (patch: Partial<Transform>) =>
      at({ x: 150, y: 250, scale: 0.8, rotation: 30, ...patch });
    expect(run(at150({ x: 150 + O.pinExit - 1 }), held, pin).lock.pin).toBe(true);
    expect(run(at150({ x: 150 + O.pinExit }), held, pin).lock.pin).toBe(false);
    expect(run(at150({ scale: 0.8 * (1 + O.pinScaleExit * 0.9) }), held, pin).lock.pin).toBe(true);
    expect(run(at150({ scale: 0.8 * (1 + O.pinScaleExit * 1.1) }), held, pin).lock.pin).toBe(false);
    expect(run(at150({ rotation: 30 + O.pinRotationExit - 0.5 }), held, pin).lock.pin).toBe(true);
    expect(run(at150({ rotation: 30 + O.pinRotationExit + 0.5 }), held, pin).lock.pin).toBe(false);
  });

  it("measures the rotation the short way around", () => {
    const wrapPin = at({ x: 150, y: 250, rotation: 179 });
    expect(run(at({ x: 150, y: 250, rotation: -180 }), NO_MAGNET_LOCK, wrapPin).lock.pin).toBe(
      true,
    );
  });

  it("does nothing special without a pin", () => {
    expect(run(at({ x: 150, y: 250 }), { ...NO_MAGNET_LOCK, pin: true }).lock.pin).toBe(false);
  });
});

describe("magnetEngaged", () => {
  const free = NO_MAGNET_LOCK;

  it("is false while nothing changes and while everything stays free", () => {
    expect(magnetEngaged(free, free)).toBe(false);
    const held = { ...free, axisX: true, rotation: true };
    expect(magnetEngaged(held, held)).toBe(false);
  });

  it.each(["axisX", "axisY", "rotation", "pin"] as const)("is true when %s gets grabbed", (key) => {
    expect(magnetEngaged(free, { ...free, [key]: true })).toBe(true);
  });

  it("is false when something is released", () => {
    expect(magnetEngaged({ ...free, axisX: true, pin: true }, free)).toBe(false);
  });

  it("is true when a second target is grabbed while the first stays held", () => {
    expect(magnetEngaged({ ...free, axisX: true }, { ...free, axisX: true, axisY: true })).toBe(
      true,
    );
  });

  it("is true when moving off the pin onto an axis", () => {
    expect(magnetEngaged({ ...free, pin: true }, { ...free, axisX: true })).toBe(true);
  });
});
