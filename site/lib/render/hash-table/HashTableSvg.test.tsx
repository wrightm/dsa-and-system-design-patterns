// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { HashTableState } from "../../trace/types";
import { HashTableSvg } from "./HashTableSvg";
import { layoutHashTable } from "./layout";
import { LIGHT } from "./palette";

afterEach(cleanup);

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
});
