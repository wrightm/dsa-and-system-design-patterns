// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type AnimationStep, HashTablePlayer } from "./HashTablePlayer";

const state = (size: number) => ({
  capacity: 2,
  size,
  threshold: 1,
  buckets: [[], size === 0 ? [] : [{ id: "k:a", key: "a", hash: "0x61" }]],
  focus: null,
  pipeline: null,
});
const excerpt = { file: "Map.java", line: 2, start: 1, lines: ["one", "two", "three"] };

function play(steps: AnimationStep[], excerpts = {}) {
  render(<HashTablePlayer title="Put" layout="chains" alt="A put" steps={steps} excerpts={excerpts} />);
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const groups = () => Array.from(screen.getByRole("img").querySelectorAll(":scope > g"));

describe("HashTablePlayer", () => {
  it("draws each step's own scene, named by the alt text", () => {
    play([
      { caption: "empty", excerpt: null, state: state(0) },
      { caption: "stored", excerpt: null, state: state(1) },
    ]);
    const svg = screen.getByRole("img", { name: "A put" });
    expect(svg.textContent).not.toContain("a");
    fireEvent.click(screen.getByRole("button", { name: "Forward" }));
    expect(screen.getByRole("img", { name: "A put" }).textContent).toContain("a");
    expect(screen.getByRole("figure", { name: "Animation: Put" })).toBeTruthy();
  });

  it("shows each step's line of code, and says so when a step has none", () => {
    play(
      [
        { caption: "hashes", excerpt: "Map.java:2", state: state(0) },
        { caption: "stored", excerpt: null, state: state(1) },
      ],
      { "Map.java:2": excerpt },
    );
    expect(screen.getByText("Map.java").closest("p")!.textContent).toBe("Map.java, line 2");
    fireEvent.click(screen.getByRole("button", { name: "Forward" }));
    expect(screen.getByText("No line of code for this step.")).toBeTruthy();
  });

  it("lays out new steps when it is given them", () => {
    const one = [{ caption: "empty", excerpt: null, state: state(0) }];
    const { rerender } = render(<HashTablePlayer title="Put" layout="chains" alt="A put" steps={one} excerpts={{}} />);
    const two = [{ caption: "stored", excerpt: null, state: state(1) }];
    rerender(<HashTablePlayer title="Put" layout="chains" alt="A put" steps={two} excerpts={{}} />);
    expect(screen.getByRole("img", { name: "A put" }).textContent).toContain("a");
  });

  // Motion moves its groups with a style transform; a plain group carries a transform attribute.
  it("tweens the drawing with Motion by default", () => {
    play([{ caption: "stored", excerpt: null, state: state(1) }]);
    expect(groups().length).toBeGreaterThan(0);
    expect(groups().filter((g) => g.hasAttribute("transform"))).toEqual([]);
  });

  it("draws each step in place when the reader prefers reduced motion", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
    play([{ caption: "stored", excerpt: null, state: state(1) }]);
    expect(groups().length).toBeGreaterThan(0);
    expect(groups().every((g) => g.hasAttribute("transform"))).toBe(true);
  });

  it("leaves out the code panel when no step names a line", () => {
    play([{ caption: "empty", excerpt: null, state: state(0) }]);
    expect(screen.queryByText("No line of code for this step.")).toBeNull();
  });
});
