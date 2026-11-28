// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { HashTableState } from "../../trace/types";
import { HashTableSvg } from "./HashTableSvg";
import { layoutHashTable } from "./layout";
import { LIGHT } from "./palette";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const awkward = `a"b\\c<&\nü`;

const state: HashTableState = {
  capacity: 2,
  size: 1,
  threshold: 1,
  buckets: [[{ id: "k:x", key: awkward, value: "v", hash: "0x0" }], []],
  focus: { bucket: 0, node: "k:x" },
  pipeline: { key: awkward, hashCode: "0x00000001", spread: "0x00000001", index: 0 },
};

describe("HashTableSvg", () => {
  it("draws keys as text, unchanged, never as markup", () => {
    const { container } = render(
      <HashTableSvg scene={layoutHashTable(state, "chains")} palette={LIGHT} animate={false} label="A table" />,
    );
    const texts = Array.from(container.querySelectorAll("text")).map((t) => t.textContent);
    expect(texts.filter((t) => t === awkward)).toHaveLength(2); // the node and the pipeline key
    expect(container.querySelector("b, script")).toBeNull();
    expect(container.querySelector("svg")!.getAttribute("aria-label")).toBe("A table");
  });

  it("draws each item where `positions` says, with the given opacity", () => {
    const { container } = render(
      <HashTableSvg
        scene={layoutHashTable(state, "chains")}
        palette={LIGHT}
        animate
        positions={{ "k:x": { x: 7, y: 9, opacity: 0.5 } }}
      />,
    );
    const node = Array.from(container.querySelectorAll("g")).find((g) => g.textContent === awkward && g.querySelector("rect[rx='6']"));
    expect(node!.getAttribute("transform")).toBe("translate(7 9)");
    expect(node!.getAttribute("opacity")).toBe("0.5");
  });

  it("draws a 1024-bucket grid as one path per colour band in use", () => {
    const grid: HashTableState = { ...state, capacity: 1024, buckets: Array.from({ length: 1024 }, () => []), focus: null };
    const { container } = render(<HashTableSvg scene={layoutHashTable(grid, "grid")} palette={LIGHT} animate />);
    expect(container.querySelectorAll("path[d^='M']").length).toBeLessThanOrEqual(5 + 3); // bands, plus pipeline arrowheads
    expect(container.querySelectorAll("rect").length).toBeLessThan(40);
  });

  it("draws a focused or fading grid cell on its own, outlining only the focused one heavily", () => {
    const grid: HashTableState = { ...state, capacity: 64, buckets: Array.from({ length: 64 }, () => []), focus: { bucket: 3, node: null }, pipeline: null };
    const { container } = render(
      <HashTableSvg
        scene={layoutHashTable(grid, "grid")}
        palette={LIGHT}
        animate={false}
        positions={{ "b:5": { x: 1, y: 2, opacity: 0.5 } }}
      />,
    );
    const cells = Array.from(container.querySelectorAll("g > rect"), (r) => ({
      width: r.getAttribute("stroke-width"),
      at: r.parentElement!.getAttribute("transform"),
      opacity: r.parentElement!.getAttribute("opacity"),
    })).filter((c) => c.width !== null);
    expect(cells.filter((c) => c.width === "2.5")).toEqual([expect.objectContaining({ opacity: null })]);
    expect(cells.filter((c) => c.opacity !== null)).toEqual([{ width: "0.5", at: "translate(1 2)", opacity: "0.5" }]);
  });

  it("pads the drawing by 8 on every side, and scales down but never past its own size", () => {
    const { container } = render(
      <HashTableSvg scene={{ width: 100, height: 50, items: [] }} palette={LIGHT} animate={false} />,
    );
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("viewBox")).toBe("-8 -8 116 66");
    expect(svg.getAttribute("width")).toBe("100%");
    expect(svg.getAttribute("style")).toBe("max-width: 116px; height: auto; display: block; margin: 0px auto;");
  });

  it("draws the grid's bands with no warnings from React", () => {
    const errors = vi.spyOn(console, "error");
    const grid: HashTableState = {
      ...state,
      capacity: 4,
      buckets: [[], [{ id: "k:a", key: "a", value: "v", hash: "0x0" }], [], []],
      focus: null,
      pipeline: null,
    };
    const { container } = render(<HashTableSvg scene={layoutHashTable(grid, "grid")} palette={LIGHT} animate />);
    expect(Array.from(container.querySelectorAll("path[fill]"), (p) => p.getAttribute("fill"))).toEqual(
      [LIGHT.heat[0], LIGHT.heat[1]],
    );
    expect(errors).not.toHaveBeenCalled();
  });
});
