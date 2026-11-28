import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { HashTableState, Node } from "../../trace/types";
import { validateTrace } from "../../trace/validate";
import { REPO_ROOT } from "../../../test/repo-root";
import { type GridState, type SceneItem, fit, heatLevel, layoutHashTable, layoutTrace, slimState } from "./layout";

const animations = path.join(REPO_ROOT, "data-structures/src/main/java/learn/ds/hashmap/animations");

function committed(name: string) {
  const file = path.join(animations, `${name}.trace.json`);
  return validateTrace(JSON.parse(fs.readFileSync(file, "utf8")), file);
}

const nodesOf = (items: SceneItem[]) => items.filter((i) => i.kind === "node");

function overlaps(a: SceneItem, b: SceneItem): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

function stateWith(buckets: Node[][], capacity = buckets.length): HashTableState {
  return { capacity, size: buckets.flat().length, threshold: 6, buckets, focus: null, pipeline: null };
}

const node = (key: string): Node => ({ id: `k:${key}`, key, value: "v", hash: "0x0" });

describe("layoutHashTable", () => {
  const put = committed("put");

  for (const [label, index] of [
    ["first", 0],
    ["last", put.steps.length - 1],
  ] as const) {
    it(`puts every node of the ${label} put state in the scene once, with no boxes overlapping`, () => {
      const state = put.steps[index]!.state;
      const nodes = nodesOf(layoutHashTable(state, "chains").items);
      const ids = state.buckets.flat().map((n) => n.id);
      expect(nodes.map((n) => n.id).sort()).toEqual([...ids].sort());
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) expect(overlaps(nodes[i]!, nodes[j]!)).toBe(false);
      }
    });
  }

  it("keeps a node's id, and its place, while it stays in the same bucket", () => {
    // "alice" goes into bucket 1 at step 2 and is still there at the end.
    const before = layoutHashTable(put.steps[1]!.state, "chains").items.find((i) => i.id === "k:alice");
    const after = layoutHashTable(put.steps[3]!.state, "chains").items.find((i) => i.id === "k:alice");
    expect(before).toBeDefined();
    expect(after).toMatchObject({ x: before!.x, y: before!.y });
  });

  it("keeps a node's id when it moves to another bucket during a resize", () => {
    const resize = committed("resize");
    const scenes = layoutTrace(
      resize.steps.map((s) => s.state),
      "chains",
    );
    const at = (step: number) => scenes[step]!.items.find((i) => i.id === "k:1");
    // Step 31: "1" moves from bucket 1 to bucket 17.
    expect(at(30)).toBeDefined();
    expect(at(31)).toBeDefined();
    expect(at(31)!.x).not.toBe(at(30)!.x);
  });

  it("draws a 1024-bucket grid as 1024 counted buckets and no nodes", () => {
    const state = committed("high-bits").steps[0]!.state;
    const items = layoutHashTable(state, "grid").items;
    const buckets = items.filter((i) => i.kind === "bucket");
    expect(buckets).toHaveLength(1024);
    expect(nodesOf(items)).toHaveLength(0);
    expect(buckets.every((b) => typeof b.count === "number")).toBe(true);
    expect(buckets.find((b) => b.id === "b:0")!.count).toBe(state.buckets[0]!.length);
  });

  it("lays out the slimmed grid state exactly as the full one", () => {
    const state = committed("high-bits").steps[20]!.state;
    expect(layoutHashTable(slimState(state, "grid"), "grid")).toEqual(layoutHashTable(state, "grid"));
  });

  it("truncates a 30-character key to 12 characters and an ellipsis", () => {
    const key = "abcdefghijklmnopqrstuvwxyz0123";
    const text = nodesOf(layoutHashTable(stateWith([[node(key)]]), "chains").items)[0]!.text!;
    expect(text).toBe("abcdefghijkl…");
    expect(Array.from(text).length).toBeLessThanOrEqual(13);
  });

  it("never splits a surrogate pair when it truncates", () => {
    const key = "😀".repeat(20);
    const text = nodesOf(layoutHashTable(stateWith([[node(key)]]), "chains").items)[0]!.text!;
    expect(text).toBe(`${"😀".repeat(12)}…`);
  });

  it("keeps text that needs escaping as it is", () => {
    const key = `a"b\\c<&\nü`;
    const text = nodesOf(layoutHashTable(stateWith([[node(key)]]), "chains").items)[0]!.text;
    expect(text).toBe(key);
  });

  it("is deterministic", () => {
    const state = put.steps[6]!.state;
    expect(layoutHashTable(state, "chains")).toEqual(layoutHashTable(structuredClone(state), "chains"));
  });

  it("gives every scene of a trace the same size", () => {
    const resize = committed("resize");
    const sizes = new Set(layoutTrace(resize.steps.map((s) => s.state), "chains").map((s) => `${s.width}x${s.height}`));
    expect(sizes.size).toBe(1);
  });

  it("draws a bucket the state does not list as an empty one", () => {
    const items = layoutHashTable(stateWith([[node("a")]], 2), "chains").items;
    expect(items.filter((i) => i.kind === "bucket").map((i) => i.id)).toEqual(["b:0", "b:1"]);
    expect(nodesOf(items).map((i) => i.id)).toEqual(["k:a"]);
  });

  it("refuses to draw chains from a state that holds only counts", () => {
    const counts = slimState(stateWith([[node("a")], []]), "grid");
    expect(() => layoutHashTable(counts, "chains")).toThrow(
      new Error("the chains layout needs the nodes, but this state holds only counts"),
    );
  });

  it("lays out an empty trace as no scenes", () => {
    expect(layoutTrace([], "chains")).toEqual([]);
  });
});

// Whole scenes, worked out by hand from the layout's constants: 28px boxes on a 36px row pitch,
// 40px buckets, 20px links, 7.8px a character plus 20px padding, the table starting at y 84.
describe("layoutHashTable, item by item", () => {
  const box = (id: string, kind: SceneItem["kind"], x: number, y: number, w: number, h: number, more = {}) => ({
    id,
    kind,
    x,
    y,
    w,
    h,
    ...more,
  });

  it("lays out the pipeline, the stats and the chains", () => {
    const state: HashTableState = {
      capacity: 2,
      size: 2,
      threshold: 1,
      buckets: [[], [node("k1"), { ...node("keyfive"), id: "k:5" }]],
      focus: { bucket: 1, node: "k:5" },
      pipeline: { key: "keyfive", hashCode: "0x0000abcd", spread: "0x0000abce", index: 1 },
    };
    // Seven characters: ceil(7 * 7.8 + 20) = 75 wide. A hex box holds ten: 98.
    expect(layoutHashTable(state, "chains")).toEqual({
      width: 375,
      height: 148,
      items: [
        box("pl:key", "label", 0, 0, 75, 16, { text: "key" }),
        box("p:key", "pipeline", 0, 18, 75, 28, { text: "keyfive", emphasis: "none" }),
        box("l:p:key", "link", 75, 18, 20, 28),
        box("pl:hashCode", "label", 95, 0, 98, 16, { text: "hashCode()" }),
        box("p:hashCode", "pipeline", 95, 18, 98, 28, { text: "0x0000abcd", emphasis: "none" }),
        box("l:p:hashCode", "link", 193, 18, 20, 28),
        box("pl:spread", "label", 213, 0, 98, 16, { text: "spread" }),
        box("p:spread", "pipeline", 213, 18, 98, 28, { text: "0x0000abce", emphasis: "none" }),
        box("l:p:spread", "link", 311, 18, 20, 28),
        box("pl:index", "label", 331, 0, 44, 16, { text: "index" }),
        box("p:index", "pipeline", 331, 18, 44, 28, { text: "1", emphasis: "focus" }),
        box("s:capacity", "label", 0, 56, 71, 16, { text: "2 buckets" }),
        box("s:size", "label", 87, 56, 47, 16, { text: "size 2" }),
        box("s:threshold", "label", 150, 56, 86, 16, { text: "threshold 1" }),
        box("b:0", "bucket", 0, 84, 40, 28, { text: "0", emphasis: "none" }),
        box("b:1", "bucket", 0, 120, 40, 28, { text: "1", emphasis: "focus" }),
        box("l:b:1", "link", 40, 120, 20, 28),
        box("k:k1", "node", 60, 120, 75, 28, { text: "k1", emphasis: "none" }),
        box("l:k:k1", "link", 135, 120, 20, 28),
        // Focused and the key being put: new. Focused for any other reason: focus.
        box("k:5", "node", 155, 120, 75, 28, { text: "keyfive", emphasis: "new" }),
      ],
    });
  });

  it("marks a focused node that is not the key being put, and widens the scene for long stats", () => {
    const state: HashTableState = {
      ...stateWith([[node("k1")]]),
      threshold: 1e20,
      focus: { bucket: 0, node: "k:k1" },
    };
    const scene = layoutHashTable(state, "chains");
    expect(scene.items.find((i) => i.id === "k:k1")!.emphasis).toBe("focus");
    // "threshold 100000000000000000000" is 31 characters: 242 wide, starting at 150.
    expect(scene.items.find((i) => i.id === "s:threshold")).toMatchObject({ x: 150, w: 242 });
    expect(scene.width).toBe(392);
  });

  it("lays out the grid, its legend and the longest chain", () => {
    const state: GridState = {
      capacity: 3,
      size: 2,
      threshold: 1,
      counts: [[1, 2]],
      focus: { bucket: 1, node: null },
      pipeline: null,
    };
    expect(layoutHashTable(state, "grid")).toEqual({
      // 32 cells of 14px on a 16px pitch.
      width: 510,
      height: 130,
      items: [
        box("s:capacity", "label", 0, 56, 71, 16, { text: "3 buckets" }),
        box("s:size", "label", 87, 56, 47, 16, { text: "size 2" }),
        box("s:threshold", "label", 150, 56, 86, 16, { text: "threshold 1" }),
        box("b:0", "bucket", 0, 84, 14, 14, { count: 0, emphasis: "none" }),
        box("b:1", "bucket", 16, 84, 14, 14, { count: 2, emphasis: "focus" }),
        box("b:2", "bucket", 32, 84, 14, 14, { count: 0, emphasis: "none" }),
        box("legend:0", "label", 0, 108, 32, 22, { text: "0", count: 0, size: 16 }),
        box("legend:1", "label", 46, 108, 32, 22, { text: "1", count: 1, size: 16 }),
        box("legend:2", "label", 92, 108, 51, 22, { text: "2–3", count: 2, size: 16 }),
        box("legend:4", "label", 157, 108, 61, 22, { text: "4–15", count: 4, size: 16 }),
        box("legend:16", "label", 232, 108, 51, 22, { text: "16+", count: 16, size: 16 }),
        box("s:longest", "label", 307, 108, 87, 22, { text: "longest 2", size: 16 }),
      ],
    });
  });

  it("widens the grid scene when the longest chain's label runs past the cells", () => {
    const state: GridState = { ...stateWith([]), capacity: 1, counts: [[0, 1e15]] };
    // "longest 1000000000000000" is 24 characters of 9.6px: 231 wide, starting at 307.
    expect(layoutHashTable(state, "grid").width).toBe(538);
  });
});

describe("slimState", () => {
  it("keeps only each node's id and key for the chains", () => {
    const state = stateWith([[node("a")], []]);
    expect(slimState(state, "chains")).toEqual({ ...state, buckets: [[{ id: "k:a", key: "a" }], []] });
  });

  it("keeps only the non-empty buckets' chain lengths for the grid", () => {
    const { buckets: _, ...rest } = stateWith([[], [node("a"), node("b")], []]);
    expect(slimState(stateWith([[], [node("a"), node("b")], []]), "grid")).toEqual({ ...rest, counts: [[1, 2]] });
  });
});

describe("fit", () => {
  it.each([
    ["abcdefghijkl", "abcdefghijkl"],
    ["abcdefghijklm", "abcdefghijkl…"],
  ])("fits %j as %j", (text, shown) => {
    expect(fit(text)).toBe(shown);
  });
});

describe("heatLevel", () => {
  it.each([
    [0, 0],
    [1, 1],
    [2, 2],
    [3, 2],
    [4, 3],
    [15, 3],
    [16, 4],
    [1000, 4],
  ])("puts a chain of %i in band %i", (count, level) => {
    expect(heatLevel(count)).toBe(level);
  });
});
