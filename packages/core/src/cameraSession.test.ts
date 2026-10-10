import { describe, expect, it } from "vitest";
import {
  addTimeSpent,
  drainClock,
  IDLE_CLOCK,
  type SessionClock,
  startClock,
  statusOnOpen,
  stopClock,
} from "./cameraSession";

const running = (since: number): SessionClock => ({ runningSince: since });

describe("startClock", () => {
  it("starts an idle clock now", () => {
    expect(startClock(IDLE_CLOCK, 1000)).toEqual(running(1000));
  });

  it("does not restart a clock that is already running", () => {
    expect(startClock(running(1000), 5000)).toEqual(running(1000));
  });
});

describe("stopClock", () => {
  it("returns the time since it started and goes idle", () => {
    expect(stopClock(running(1000), 4500)).toEqual({ clock: IDLE_CLOCK, elapsedMs: 3500 });
  });

  it("an idle clock gives 0", () => {
    expect(stopClock(IDLE_CLOCK, 4500)).toEqual({ clock: IDLE_CLOCK, elapsedMs: 0 });
  });

  it("a clock set back by the system gives 0, never a negative time", () => {
    expect(stopClock(running(5000), 1000)).toEqual({ clock: IDLE_CLOCK, elapsedMs: 0 });
  });

  it("rounds to whole milliseconds", () => {
    expect(stopClock(running(1000.4), 2000.9).elapsedMs).toBe(1001);
  });
});

describe("drainClock", () => {
  it("returns the time so far and keeps running from now", () => {
    expect(drainClock(running(1000), 3000)).toEqual({ clock: running(3000), elapsedMs: 2000 });
  });

  it("draining twice never counts the same time twice", () => {
    const first = drainClock(running(1000), 3000);
    const second = drainClock(first.clock, 3500);
    expect(first.elapsedMs + second.elapsedMs).toBe(2500);
  });

  it("an idle clock stays idle and gives 0", () => {
    expect(drainClock(IDLE_CLOCK, 3000)).toEqual({ clock: IDLE_CLOCK, elapsedMs: 0 });
  });

  it("a clock set back by the system gives 0 and restarts from now", () => {
    expect(drainClock(running(5000), 1000)).toEqual({ clock: running(1000), elapsedMs: 0 });
  });
});

describe("addTimeSpent", () => {
  it("adds whole milliseconds", () => {
    expect(addTimeSpent(1000, 250)).toBe(1250);
    expect(addTimeSpent(1000, 0.6)).toBe(1001);
  });

  it("never subtracts", () => {
    expect(addTimeSpent(1000, -500)).toBe(1000);
  });
});

describe("statusOnOpen", () => {
  it("a pending project becomes in progress", () => {
    expect(statusOnOpen("pending")).toBe("in_progress");
  });

  it("in progress and done stay as they are", () => {
    expect(statusOnOpen("in_progress")).toBe("in_progress");
    expect(statusOnOpen("done")).toBe("done");
  });
});
