// Frame-rate accounting for the camera spike's fps meter (issue #20). The UI-thread counter
// calls these from a Reanimated frame callback, so they follow transform.ts's worklet rules:
// "worklet" directive, plain objects, no throws, no outer constants in default parameters.

/** Frames seen since the window was last reset. All times in ms. */
export type FrameWindow = {
  frames: number;
  elapsedMs: number;
  /** Longest single frame interval in the window. */
  worstMs: number;
  /** Intervals longer than 1.5× the frame budget: a visible hitch. */
  longFrames: number;
};

export type FrameSummary = {
  /** Rounded frames per second over the window; 0 for an empty window. */
  fps: number;
  worstMs: number;
  longFrames: number;
};

export function emptyFrameWindow(): FrameWindow {
  "worklet";
  return { frames: 0, elapsedMs: 0, worstMs: 0, longFrames: 0 };
}

/**
 * Adds one frame interval. `budgetMs` is the display's frame time (16.7 at 60 Hz, 8.3 at
 * 120 Hz). Non-positive or non-finite intervals (the first frame after activation) are ignored.
 */
export function addFrame(window: FrameWindow, deltaMs: number, budgetMs: number): FrameWindow {
  "worklet";
  if (!(deltaMs > 0) || !Number.isFinite(deltaMs)) return window;
  return {
    frames: window.frames + 1,
    elapsedMs: window.elapsedMs + deltaMs,
    worstMs: Math.max(window.worstMs, deltaMs),
    longFrames: window.longFrames + (deltaMs > budgetMs * 1.5 ? 1 : 0),
  };
}

export function summarizeFrameWindow(window: FrameWindow): FrameSummary {
  "worklet";
  const fps = window.elapsedMs > 0 ? Math.round((window.frames * 1000) / window.elapsedMs) : 0;
  return { fps, worstMs: Math.round(window.worstMs), longFrames: window.longFrames };
}

/**
 * The display's frame budget, from the shortest interval seen so far: snapped to the nearest
 * common refresh rate (60/90/120/144 Hz), since raw vsync timestamps jitter by a ms or two.
 * React Native doesn't expose the refresh rate, and phones switch it at runtime anyway.
 * Falls back to 60 Hz until a valid interval arrives.
 */
export function frameBudgetMs(shortestMs: number): number {
  "worklet";
  if (!(shortestMs > 0) || !Number.isFinite(shortestMs)) return 1000 / 60;
  const measuredHz = 1000 / shortestMs;
  const rates = [60, 90, 120, 144];
  let best = 60;
  for (const hz of rates) {
    if (Math.abs(hz - measuredHz) < Math.abs(best - measuredHz)) best = hz;
  }
  return 1000 / best;
}
