import type { ProjectStatus } from "./models";

/**
 * Time spent drawing: the project camera runs this clock only while it is open and the app is
 * in the foreground. Times are epoch ms (`Date.now()`); the caller decides when to start, stop
 * and drain it, this module only does the arithmetic.
 */
export type SessionClock = {
  /** When the current stretch started, or `null` while stopped. */
  runningSince: number | null;
};

export const IDLE_CLOCK: SessionClock = { runningSince: null };

export type ClockReading = { clock: SessionClock; elapsedMs: number };

/** Whole ms between `since` and `now`; 0 if the system clock went back. */
function elapsedSince(since: number, now: number): number {
  return Math.max(0, Math.round(now - since));
}

/** Starts the clock at `now`; a clock already running keeps its start. */
export function startClock(clock: SessionClock, now: number): SessionClock {
  return clock.runningSince === null ? { runningSince: now } : clock;
}

/** Stops the clock and returns the time since it started (0 if it was not running). */
export function stopClock(clock: SessionClock, now: number): ClockReading {
  if (clock.runningSince === null) return { clock: IDLE_CLOCK, elapsedMs: 0 };
  return { clock: IDLE_CLOCK, elapsedMs: elapsedSince(clock.runningSince, now) };
}

/**
 * Returns the time since the last start or drain and keeps running from `now`, for saves while
 * the camera stays open: each stretch is counted exactly once.
 */
export function drainClock(clock: SessionClock, now: number): ClockReading {
  if (clock.runningSince === null) return { clock: IDLE_CLOCK, elapsedMs: 0 };
  return { clock: { runningSince: now }, elapsedMs: elapsedSince(clock.runningSince, now) };
}

/** `timeSpentMs` plus `elapsedMs`, as whole ms; a negative amount adds nothing. */
export function addTimeSpent(timeSpentMs: number, elapsedMs: number): number {
  return timeSpentMs + Math.max(0, Math.round(elapsedMs));
}

/** Status after opening the project's camera: a pending project starts; others stay. */
export function statusOnOpen(status: ProjectStatus): ProjectStatus {
  return status === "pending" ? "in_progress" : status;
}
