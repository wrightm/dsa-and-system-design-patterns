"use client";

import { type KeyboardEvent, type ReactNode, useEffect, useReducer, useSyncExternalStore } from "react";
import { type PlayerState, type Speed, playerReducer } from "../lib/player/reducer";

const BASE_STEP_MS = 1800;
const SPEEDS: Speed[] = [0.5, 1, 2];
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/** Any step with a caption: a trace's own `Step`, or a slimmed copy made for the browser. */
type PlayerStep = { caption: string };

type PlayerProps<S extends PlayerStep> = {
  trace: { title: string; steps: readonly S[] };
  renderStep: (step: S, previous: S | null, reducedMotion: boolean) => ReactNode;
  footer?: (step: S) => ReactNode;
};

function subscribeReducedMotion(onChange: () => void): () => void {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => {};
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener?.("change", onChange);
  return () => query.removeEventListener?.("change", onChange);
}

function reducedMotionSnapshot(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

// The server and the first client render both see `false`, so hydration matches.
function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribeReducedMotion, reducedMotionSnapshot, () => false);
}

// The step buttons use aria-disabled at an end rather than disabled, so a keyboard user who
// presses Forward onto the last step keeps focus inside the player.
const buttonClass =
  "rounded-md border border-fd-border bg-fd-secondary px-3 py-1 text-sm text-fd-secondary-foreground " +
  "hover:bg-fd-accent disabled:cursor-not-allowed disabled:opacity-50 " +
  "aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:hover:bg-fd-secondary";

export function Player<S extends PlayerStep>({ trace, renderStep, footer }: PlayerProps<S>) {
  const steps = trace.steps;
  const stepCount = steps.length;
  const [state, dispatch] = useReducer(
    (s: PlayerState, a: Parameters<typeof playerReducer>[1]) => playerReducer(s, a, stepCount),
    { index: 0, playing: false, speed: 1 } satisfies PlayerState,
  );
  const reducedMotion = useReducedMotion();

  // Autoplay advances regardless of reduced motion; only the renderer tweens or cuts.
  useEffect(() => {
    if (!state.playing) return;
    const timer = setInterval(() => dispatch({ type: "tick" }), BASE_STEP_MS / state.speed);
    return () => clearInterval(timer);
  }, [state.playing, state.speed]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") dispatch({ type: "pause" });
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const step = steps[state.index];
  const previous = state.index > 0 ? (steps[state.index - 1] ?? null) : null;
  const canMove = stepCount > 1;
  const atStart = !canMove || state.index === 0;
  const atEnd = !canMove || state.index === stepCount - 1;

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const target = event.target as HTMLElement;
    // Form controls keep their own keys (arrows move the range, the select opens).
    if (["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName)) return;
    switch (event.key) {
      case "ArrowLeft":
        dispatch({ type: "prev" });
        break;
      case "ArrowRight":
        dispatch({ type: "next" });
        break;
      case "Home":
        dispatch({ type: "first" });
        break;
      case "End":
        dispatch({ type: "last" });
        break;
      case " ":
        // A focused button already activates itself on Space.
        if (target.tagName === "BUTTON") return;
        dispatch({ type: state.playing ? "pause" : "play" });
        break;
      default:
        return;
    }
    event.preventDefault();
  }

  return (
    <figure
      className="my-6 rounded-lg border border-fd-border bg-fd-card p-4 text-fd-card-foreground"
      aria-label={`Animation: ${trace.title}`}
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      <div className="min-h-32 overflow-x-auto">{step ? renderStep(step, previous, reducedMotion) : null}</div>
      <figcaption className="mt-3">
        <p aria-live="polite" className="min-h-6 text-sm">
          {step?.caption ?? ""}
        </p>
        {step && footer ? <div className="mt-2">{footer(step)}</div> : null}
      </figcaption>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" className={buttonClass} aria-disabled={atStart} onClick={() => dispatch({ type: "first" })}>
          First
        </button>
        <button type="button" className={buttonClass} aria-disabled={atStart} onClick={() => dispatch({ type: "prev" })}>
          Back
        </button>
        <button
          type="button"
          className={buttonClass}
          disabled={!canMove}
          onClick={() => dispatch({ type: state.playing ? "pause" : "play" })}
        >
          {state.playing ? "Pause" : "Play"}
        </button>
        <button type="button" className={buttonClass} aria-disabled={atEnd} onClick={() => dispatch({ type: "next" })}>
          Forward
        </button>
        <button type="button" className={buttonClass} aria-disabled={atEnd} onClick={() => dispatch({ type: "last" })}>
          Last
        </button>
        <span className="ml-auto text-sm text-fd-muted-foreground">
          step {stepCount === 0 ? 0 : state.index + 1} of {stepCount}
        </span>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <input
          type="range"
          aria-label="Step"
          className="min-w-0 flex-1 accent-fd-primary"
          min={0}
          max={Math.max(stepCount - 1, 0)}
          step={1}
          value={state.index}
          disabled={!canMove}
          onChange={(event) => dispatch({ type: "seek", index: Number(event.target.value) })}
        />
        <label className="flex items-center gap-2 text-sm text-fd-muted-foreground">
          <span>Speed</span>
          <select
            className="rounded-md border border-fd-border bg-fd-background px-2 py-1 text-fd-foreground"
            value={state.speed}
            onChange={(event) => dispatch({ type: "speed", speed: Number(event.target.value) as Speed })}
          >
            {SPEEDS.map((speed) => (
              <option key={speed} value={speed}>
                {speed}x
              </option>
            ))}
          </select>
        </label>
      </div>
    </figure>
  );
}
