import { describe, expect, it } from "vitest";
import type { Transform } from "./models";
import { holdDistance, holdSpeed, moveWithin, NUDGE_HOLD, nudgeMove } from "./nudgeHold";

const { delayMs, rampMs, startSpeed, maxSpeed } = NUDGE_HOLD;

describe("holdSpeed", () => {
  it("is 0 until the repetition starts", () => {
    expect(holdSpeed(0)).toBe(0);
    expect(holdSpeed(delayMs - 1)).toBe(0);
  });

  it("starts at startSpeed and reaches maxSpeed after the ramp", () => {
    expect(holdSpeed(delayMs)).toBeCloseTo(startSpeed);
    expect(holdSpeed(delayMs + rampMs)).toBe(maxSpeed);
    expect(holdSpeed(delayMs + rampMs + 5000)).toBe(maxSpeed);
  });

  it("only goes up and never beyond maxSpeed", () => {
    let last = 0;
    for (let ms = 0; ms <= delayMs + rampMs + 500; ms += 10) {
      const speed = holdSpeed(ms);
      expect(speed).toBeGreaterThanOrEqual(last);
      expect(speed).toBeLessThanOrEqual(maxSpeed);
      last = speed;
    }
  });

  it("accepts another curve", () => {
    const config = { ...NUDGE_HOLD, delayMs: 0, maxSpeed: 100, startSpeed: 10, rampMs: 1000 };
    expect(holdSpeed(0, config)).toBe(10);
    expect(holdSpeed(1000, config)).toBe(100);
  });
});

describe("holdDistance", () => {
  it("is 0 until the repetition starts", () => {
    expect(holdDistance(0)).toBe(0);
    expect(holdDistance(delayMs)).toBe(0);
  });

  it("is continuous where the ramp ends", () => {
    const before = holdDistance(delayMs + rampMs - 0.001);
    const after = holdDistance(delayMs + rampMs + 0.001);
    expect(after - before).toBeCloseTo((maxSpeed * 0.002) / 1000, 4);
  });

  it("grows at maxSpeed once the ramp is over", () => {
    const at = holdDistance(delayMs + rampMs + 1000) - holdDistance(delayMs + rampMs);
    expect(at).toBeCloseTo(maxSpeed, 6);
  });

  it("stays a creep right after the repetition starts", () => {
    // Half a second in: well under the 400 px/s cruise, it still has to be fine.
    expect(holdDistance(delayMs + 500)).toBeLessThan(25);
  });

  it("matches the integral of holdSpeed", () => {
    let sum = 0;
    const dt = 0.5;
    for (let ms = 0; ms < delayMs + rampMs + 800; ms += dt) {
      sum += (holdSpeed(ms + dt / 2) * dt) / 1000;
    }
    expect(holdDistance(delayMs + rampMs + 800)).toBeCloseTo(sum, 0);
  });

  it("gives the same distance at 60 and 120 Hz", () => {
    const total = (frameMs: number) => {
      let moved = 0;
      let last = 0;
      for (let now = frameMs; now <= 3000 + 1e-6; now += frameMs) {
        moved += holdDistance(now) - holdDistance(last);
        last = now;
      }
      return moved;
    };
    expect(total(1000 / 120)).toBeCloseTo(total(1000 / 60), 1);
  });

  it("catches up after a dropped frame", () => {
    const smooth = holdDistance(2000) - holdDistance(1000);
    const gap = holdDistance(2000) - holdDistance(1500) + (holdDistance(1500) - holdDistance(1000));
    expect(gap).toBeCloseTo(smooth, 9);
  });
});

describe("moveWithin", () => {
  it("moves freely inside the range", () => {
    expect(moveWithin(50, 3, 0, 100)).toEqual({ next: 53, hitLimit: false });
    expect(moveWithin(50, -3, 0, 100)).toEqual({ next: 47, hitLimit: false });
  });

  it("stops on the limit and reports it", () => {
    expect(moveWithin(99, 5, 0, 100)).toEqual({ next: 100, hitLimit: true });
    expect(moveWithin(1, -5, 0, 100)).toEqual({ next: 0, hitLimit: true });
    expect(moveWithin(100, 1, 0, 100)).toEqual({ next: 100, hitLimit: true });
  });

  it("lets a value outside come back in, without jumping to the range", () => {
    expect(moveWithin(130, -10, 0, 100)).toEqual({ next: 120, hitLimit: false });
    expect(moveWithin(-30, 10, 0, 100)).toEqual({ next: -20, hitLimit: false });
  });

  it("does not push a value further out", () => {
    expect(moveWithin(130, 10, 0, 100)).toEqual({ next: 130, hitLimit: true });
    expect(moveWithin(-30, -10, 0, 100)).toEqual({ next: -30, hitLimit: true });
  });

  it("does nothing for a zero delta", () => {
    expect(moveWithin(50, 0, 0, 100)).toEqual({ next: 50, hitLimit: false });
  });
});

describe("nudgeMove", () => {
  const viewport = { width: 400, height: 800 };
  const base: Transform = { x: 200, y: 400, scale: 0.7, rotation: 0, flipX: false, flipY: false };

  it("moves along the four screen axes", () => {
    expect(nudgeMove(base, "right", 1, viewport).transform).toMatchObject({ x: 201, y: 400 });
    expect(nudgeMove(base, "left", 1, viewport).transform).toMatchObject({ x: 199, y: 400 });
    expect(nudgeMove(base, "up", 1, viewport).transform).toMatchObject({ x: 200, y: 399 });
    expect(nudgeMove(base, "down", 1, viewport).transform).toMatchObject({ x: 200, y: 401 });
  });

  it("keeps scale, rotation and mirror", () => {
    const t: Transform = { ...base, rotation: 37, flipX: true, flipY: true, scale: 1.9 };
    const moved = nudgeMove(t, "right", 5, viewport).transform;
    expect(moved).toMatchObject({ rotation: 37, flipX: true, flipY: true, scale: 1.9 });
  });

  it.each([0, 37, 90, -135])("moves on screen axes with rotation %d°", (rotation) => {
    for (const flipX of [false, true]) {
      for (const flipY of [false, true]) {
        const t = { ...base, rotation, flipX, flipY };
        expect(nudgeMove(t, "right", 4, viewport).transform).toMatchObject({ x: 204, y: 400 });
        expect(nudgeMove(t, "up", 4, viewport).transform).toMatchObject({ x: 200, y: 396 });
      }
    }
  });

  it("keeps the center inside the canvas", () => {
    const edge = { ...base, x: 399.5, y: 0.5 };
    const right = nudgeMove(edge, "right", 5, viewport);
    expect(right.transform.x).toBe(400);
    expect(right.hitLimit).toBe(true);
    const up = nudgeMove(edge, "up", 5, viewport);
    expect(up.transform.y).toBe(0);
    expect(up.hitLimit).toBe(true);
  });

  it("can move back from outside the canvas", () => {
    const out = { ...base, x: 450 };
    const back = nudgeMove(out, "left", 10, viewport);
    expect(back.transform.x).toBe(440);
    expect(back.hitLimit).toBe(false);
    expect(nudgeMove(out, "right", 10, viewport).transform.x).toBe(450);
  });

  it("does not mutate its input", () => {
    const copy = { ...base };
    nudgeMove(base, "down", 3, viewport);
    expect(base).toEqual(copy);
  });
});
