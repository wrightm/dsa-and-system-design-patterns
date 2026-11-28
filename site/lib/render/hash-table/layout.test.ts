import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { HashTableState, Node } from "../../trace/types";
import { validateTrace } from "../../trace/validate";
import { REPO_ROOT } from "../../../test/repo-root";
import { type SceneItem, layoutHashTable, layoutTrace, slimState } from "./layout";

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
