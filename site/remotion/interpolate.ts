import type { Positions } from "../lib/render/hash-table/HashTableSvg";
import type { Scene } from "../lib/render/hash-table/layout";
import type { Trace } from "../lib/trace/types";

// Pure functions of (trace, frame number): no clocks, no randomness, so a re-render gives the same video.

export const FPS = 30;
/** The title card. */
const TITLE_FRAMES = Math.round(2.5 * FPS);
/** How long a step takes to move from the step before into place (the site's player takes 0.45 s). */
const TRANSITION_FRAMES = Math.round(0.5 * FPS);
/** Time to take in the drawing, before any reading. */
const BASE_SECONDS = 1.2;
/** Reading speed for a caption: about 40 characters a second, a fast but comfortable rate for on-screen text. */
const CHARS_PER_SECOND = 40;
const MIN_STEP_FRAMES = Math.round(2.2 * FPS);
const MAX_STEP_FRAMES = 5 * FPS;
/** The shortest a step may be squeezed to, so a long trace still fits under a minute. */
const FLOOR_STEP_FRAMES = FPS;
/** Extra time on the last state before the end card. */
const LAST_HOLD_FRAMES = FPS;
const END_FRAMES = Math.round(3.5 * FPS);
/** LinkedIn plays video up to ten minutes, but the brief wants under 60 s; keep a second spare. */
export const MAX_FRAMES = 59 * FPS;

const clamp01 = (t: number) => (Number.isNaN(t) ? 0 : Math.min(1, Math.max(0, t)));

/**
 * Where each item of either scene is drawn at progress `t` (clamped to 0..1) from `from` to `to`.
 * An item in both moves in a straight line; an item only in `to` fades in where it lands; an
 * item only in `from` fades out where it was. Nothing jumps.
 */
export function positionsAt(from: Scene, to: Scene, t: number): Positions {
  const p = clamp01(t);
  const before = new Map(from.items.map((item) => [item.id, item]));
  const positions: Positions = {};
  // Every item of `from` fades out where it was, unless `to` has it too and the loop below moves it.
  for (const item of from.items) positions[item.id] = { x: item.x, y: item.y, opacity: 1 - p };
  for (const item of to.items) {
    const was = before.get(item.id);
    positions[item.id] = was
      ? { x: was.x + (item.x - was.x) * p, y: was.y + (item.y - was.y) * p, opacity: 1 }
      : { x: item.x, y: item.y, opacity: p };
  }
  return positions;
}

/**
 * The scene to draw during a move: the items of `to`, drawn as they are in `to`, with the items
 * that exist only in `from` first (underneath), so they are still there to fade out.
 */
export function mergeScenes(from: Scene, to: Scene): Scene {
  const kept = new Set(to.items.map((item) => item.id));
  return { ...to, items: [...from.items.filter((item) => !kept.has(item.id)), ...to.items] };
}

export type Timeline = {
  /** Frames of the title card, which starts at frame 0. */
  title: number;
  /** Frames each step after the first spends moving into place. */
  transition: number;
  /** Each step's first frame and length, back to back from the end of the title card. */
  steps: { start: number; frames: number }[];
  /** First frame of the end card; equals `total` when there is no end card. */
  end: number;
  total: number;
};

/** Frames to hold a caption: longer captions longer, between about 2 and 5 seconds. */
function holdFor(caption: string): number {
  const seconds = BASE_SECONDS + Array.from(caption).length / CHARS_PER_SECOND;
  return Math.min(MAX_STEP_FRAMES, Math.max(MIN_STEP_FRAMES, Math.round(seconds * FPS)));
}

/**
 * When each part of the video plays. A trace with no steps is a title card alone. Otherwise the
 * title card, each step (the last held a little longer), then the end card. If that runs past
 * `MAX_FRAMES`, every step is shortened in proportion, but never below one second.
 */
export function timeline(trace: Trace): Timeline {
  if (trace.steps.length === 0) {
    return { title: TITLE_FRAMES, transition: TRANSITION_FRAMES, steps: [], end: TITLE_FRAMES, total: TITLE_FRAMES };
  }
  let holds = trace.steps.map((step) => holdFor(step.caption));
  const budget = MAX_FRAMES - TITLE_FRAMES - END_FRAMES - LAST_HOLD_FRAMES;
  const wanted = holds.reduce((sum, frames) => sum + frames, 0);
  // Stryker disable next-line EqualityOperator: when the steps want exactly the budget, scaling them by one changes nothing. This relies on every hold being at least the 1 s floor, so the floor never lifts one.
  if (wanted > budget) {
    holds = holds.map((frames) => Math.max(FLOOR_STEP_FRAMES, Math.floor((frames * budget) / wanted)));
  }
  holds[holds.length - 1]! += LAST_HOLD_FRAMES;

  let start = TITLE_FRAMES;
  const steps = holds.map((frames) => {
    const step = { start, frames };
    start += frames;
    return step;
  });
  return { title: TITLE_FRAMES, transition: TRANSITION_FRAMES, steps, end: start, total: start + END_FRAMES };
}

/** What frame `frame` shows. `t` is the step's linear progress in from the step before (1 once in place). */
export type Moment = { kind: "title" } | { kind: "step"; index: number; t: number } | { kind: "end" };

export function at(tl: Timeline, frame: number): Moment {
  // Before the video is the title card, and after it the end card (or the title card when it has no steps).
  const f = Math.floor(frame);
  if (f < tl.title || tl.steps.length === 0) return { kind: "title" };
  if (f >= tl.end) return { kind: "end" };
  const index = tl.steps.findIndex((step) => f < step.start + step.frames);
  const t = index === 0 ? 1 : clamp01((f - tl.steps[index]!.start) / tl.transition);
  return { kind: "step", index, t };
}
