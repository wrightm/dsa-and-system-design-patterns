// @vitest-environment jsdom
// What HashTableSvg asks of Motion, with Motion replaced by elements that show the props given.
import { cleanup, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { HashTableState } from "../../trace/types";
import { HashTableSvg } from "./HashTableSvg";
import { layoutHashTable } from "./layout";
import { LIGHT } from "./palette";

vi.mock("motion/react", () => ({
  AnimatePresence: ({ initial, children }: { initial: boolean; children: ReactNode }) => (
    <g data-presence={String(initial)}>{children}</g>
  ),
  motion: {
    g: ({ initial, animate, exit, transition, children }: Record<string, unknown> & { children: ReactNode }) => (
      <g data-motion={JSON.stringify({ initial, animate, exit, transition })}>{children}</g>
    ),
  },
}));

afterEach(cleanup);

const chains: HashTableState = {
  capacity: 1,
  size: 1,
  threshold: 1,
  buckets: [[{ id: "k:a", key: "a", value: "v", hash: "0x0" }]],
  focus: null,
  pipeline: null,
};

const draw = (state: HashTableState, layout: "chains" | "grid", animate: boolean) =>
  render(<HashTableSvg scene={layoutHashTable(state, layout)} palette={LIGHT} animate={animate} />).container;

const moving = (container: HTMLElement) =>
  Array.from(container.querySelectorAll("[data-motion]"), (g) => JSON.parse(g.getAttribute("data-motion")!));

describe("HashTableSvg with Motion", () => {
  it("tweens each item from where the scene puts it, fading new ones in and old ones out", () => {
    const container = draw(chains, "chains", true);
    const scene = layoutHashTable(chains, "chains");
    expect(container.querySelector("[data-presence]")!.getAttribute("data-presence")).toBe("false");
    expect(moving(container)).toEqual(
      scene.items.map((item) => ({
        initial: { opacity: 0, x: item.x, y: item.y },
        animate: { opacity: 1, x: item.x, y: item.y },
        exit: { opacity: 0 },
        transition: { duration: 0.45, ease: "easeInOut" },
      })),
    );
    // Every item is tweened, so none is also drawn in place.
    expect(container.querySelectorAll("svg > g[transform]")).toHaveLength(0);
  });

  it("draws everything in place when not animating", () => {
    const container = draw(chains, "chains", false);
    expect(container.querySelector("[data-presence]")).toBeNull();
    expect(container.querySelectorAll("svg > g[transform]")).toHaveLength(layoutHashTable(chains, "chains").items.length);
  });

  it("keeps grid cells in place while tweening the rest", () => {
    const grid = { ...chains, focus: { bucket: 0, node: null } };
    const container = draw(grid, "grid", true);
    const items = layoutHashTable(grid, "grid").items;
    // The focused cell is drawn on its own, in place; the labels tween.
    expect(container.querySelectorAll("svg > g[transform]")).toHaveLength(1);
    expect(moving(container)).toHaveLength(items.filter((i) => i.kind !== "bucket").length);
  });
});
