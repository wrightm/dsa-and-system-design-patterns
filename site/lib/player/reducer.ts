export type Speed = 0.5 | 1 | 2;

export type PlayerState = { index: number; playing: boolean; speed: Speed };

export type PlayerAction =
  | { type: "next" | "prev" | "play" | "pause" | "tick" | "first" | "last" }
  | { type: "seek"; index: number }
  | { type: "speed"; speed: Speed };

/** Moves to `index`, clamped to the trace. Reaching the last step stops playback. */
function moveTo(state: PlayerState, index: number, stepCount: number): PlayerState {
  const last = stepCount - 1;
  const clamped = Math.min(Math.max(index, 0), last);
  return {
    ...state,
    index: clamped,
    playing: state.playing && clamped < last,
  };
}

export function playerReducer(
  state: PlayerState,
  action: PlayerAction,
  stepCount: number,
): PlayerState {
  // A trace with zero or one step has nothing to move through.
  if (stepCount <= 1) {
    return action.type === "speed"
      ? { index: 0, playing: false, speed: action.speed }
      : { index: 0, playing: false, speed: state.speed };
  }
  switch (action.type) {
    case "next":
      return moveTo(state, state.index + 1, stepCount);
    case "prev":
      return moveTo(state, state.index - 1, stepCount);
    case "first":
      return moveTo(state, 0, stepCount);
    case "last":
      return moveTo(state, stepCount - 1, stepCount);
    case "seek": {
      const index = Number(action.index);
      if (!Number.isFinite(index)) return state;
      return moveTo(state, Math.round(index), stepCount);
    }
    case "tick":
      return state.playing ? moveTo(state, state.index + 1, stepCount) : state;
    case "play":
      return { ...state, index: state.index >= stepCount - 1 ? 0 : state.index, playing: true };
    case "pause":
      return { ...state, playing: false };
    case "speed":
      return { ...state, speed: action.speed };
  }
}
