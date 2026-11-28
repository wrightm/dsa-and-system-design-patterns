import { describe, expect, it } from "vitest";
import { type PlayerAction, type PlayerState, playerReducer } from "./reducer";

const at = (index: number, playing = false): PlayerState => ({ index, playing, speed: 1 });

describe("playerReducer", () => {
  it("next at the last index and prev at 0 leave the index unchanged", () => {
    expect(playerReducer(at(2), { type: "next" }, 3).index).toBe(2);
    expect(playerReducer(at(0), { type: "prev" }, 3).index).toBe(0);
  });

  it("moves one step with next and prev", () => {
    expect(playerReducer(at(1), { type: "next" }, 3).index).toBe(2);
    expect(playerReducer(at(1), { type: "prev" }, 3).index).toBe(0);
  });

  it("first and last jump to the ends", () => {
    expect(playerReducer(at(1), { type: "first" }, 3).index).toBe(0);
    expect(playerReducer(at(1), { type: "last" }, 3).index).toBe(2);
  });

  it("seek clamps negative and too-large indexes", () => {
    expect(playerReducer(at(1), { type: "seek", index: -3 }, 5).index).toBe(0);
    expect(playerReducer(at(1), { type: "seek", index: 999 }, 5).index).toBe(4);
  });

  it("seek ignores NaN and rounds non-integers", () => {
    expect(playerReducer(at(1), { type: "seek", index: Number.NaN }, 5)).toEqual(at(1));
    expect(playerReducer(at(1), { type: "seek", index: "3" as unknown as number }, 5).index).toBe(3);
    expect(playerReducer(at(1), { type: "seek", index: 2.6 }, 5).index).toBe(3);
  });

  it("tick advances while playing and stops on reaching the last step", () => {
    const afterTick = playerReducer(at(0, true), { type: "tick" }, 3);
    expect(afterTick).toEqual(at(1, true));
    expect(playerReducer(afterTick, { type: "tick" }, 3)).toEqual(at(2, false));
  });

  it("tick does nothing while paused", () => {
    expect(playerReducer(at(1), { type: "tick" }, 3)).toEqual(at(1));
  });

  it("play at the last step restarts from 0", () => {
    expect(playerReducer(at(2), { type: "play" }, 3)).toEqual(at(0, true));
  });

  it("play and pause toggle playing without moving", () => {
    expect(playerReducer(at(1), { type: "play" }, 3)).toEqual(at(1, true));
    expect(playerReducer(at(1, true), { type: "pause" }, 3)).toEqual(at(1));
  });

  it("changes speed", () => {
    expect(playerReducer(at(1), { type: "speed", speed: 2 }, 3).speed).toBe(2);
  });

  it.each([0, 1])("with stepCount %i every action returns index 0 and not playing", (count) => {
    const actions: PlayerAction[] = [
      { type: "next" },
      { type: "prev" },
      { type: "play" },
      { type: "pause" },
      { type: "tick" },
      { type: "first" },
      { type: "last" },
      { type: "seek", index: 5 },
      { type: "seek", index: Number.NaN },
      { type: "speed", speed: 2 },
    ];
    for (const action of actions) {
      const next = playerReducer(at(4, true), action, count);
      expect(next.index).toBe(0);
      expect(next.playing).toBe(false);
    }
  });

  it("with one step or none, keeps a new speed and ignores everything else", () => {
    const fast: PlayerState = { index: 0, playing: false, speed: 2 };
    expect(playerReducer(fast, { type: "next" }, 1)).toEqual(fast);
    expect(playerReducer(fast, { type: "play" }, 0)).toEqual(fast);
    expect(playerReducer(at(0), { type: "speed", speed: 0.5 }, 1)).toEqual({ index: 0, playing: false, speed: 0.5 });
  });
});
