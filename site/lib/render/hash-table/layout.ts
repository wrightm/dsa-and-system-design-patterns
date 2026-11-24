import type { HashTableState, Node } from "../../trace/types";

export type SceneItem = {
  id: string;
  kind: "bucket" | "node" | "link" | "pipeline" | "label";
  x: number;
  y: number;
  w: number;
  h: number;
  text?: string;
  emphasis?: "focus" | "new" | "none";
  count?: number;
};

export type Scene = { width: number; height: number; items: SceneItem[] };

export type Layout = "chains" | "grid";

/** A state with only what the chains layout reads from each node. A full `HashTableState` is one. */
export type ChainsState = Omit<HashTableState, "buckets"> & { buckets: Pick<Node, "id" | "key">[][] };

/**
 * A state with chain lengths in place of nodes: all the grid layout reads, and far smaller to ship.
 * `counts` holds `[bucket, chain length]` for each non-empty bucket, in bucket order.
 */
export type GridState = Omit<HashTableState, "buckets"> & { counts: [number, number][] };

export type LayoutState = ChainsState | GridState;

/** Geometry shared by every scene of one trace, so items only move when the data moves them. */
export type Frame = { chainSlots: number; keyChars: number };

const MAX_CHARS = 12;
const CHAR_W = 7.8; // a 13px monospace character
const TEXT_PAD = 20;

const BOX_H = 28;
const ROW_PITCH = 36;
const BUCKET_W = 40;
const LINK_W = 20;
const NODE_MIN_W = 44;
const COLUMN_GAP = 32;
const ROWS_PER_COLUMN = 16;

const LABEL_H = 16;
const PIPELINE_Y = LABEL_H + 2;
const STATS_Y = PIPELINE_Y + BOX_H + 10;
const TABLE_Y = STATS_Y + LABEL_H + 12;

const HEX_W = boxWidth(10); // "0x" and eight hex digits
const INDEX_W = NODE_MIN_W;

const GRID_COLUMNS = 32;
const CELL = 14;
const CELL_PITCH = 16;

/** Lower bound of each colour band in the grid, from empty to long chains. */
export const HEAT_BANDS = [0, 1, 2, 4, 16] as const;
const BAND_LABELS = ["0", "1", "2–3", "4–15", "16+"];

/** Index into `HEAT_BANDS` (and a palette's `heat`) for a chain length. */
export function heatLevel(count: number): number {
  let level = 0;
  for (let i = 0; i < HEAT_BANDS.length; i++) if (count >= HEAT_BANDS[i]!) level = i;
  return level;
}

/**
 * Text from the trace (keys and pipeline values) at most 12 characters long, else its first 12
 * and an ellipsis. Counts code points, so never splits a surrogate pair. The layout's own labels
 * are fixed words and numbers, and are not cut.
 */
export function fit(text: string): string {
  const chars = Array.from(text);
  return chars.length > MAX_CHARS ? `${chars.slice(0, MAX_CHARS).join("")}…` : text;
}

function charCount(text: string): number {
  return Array.from(fit(text)).length;
}

function boxWidth(chars: number): number {
  return Math.max(NODE_MIN_W, Math.ceil(chars * CHAR_W + TEXT_PAD));
}

function isGrid(state: LayoutState): state is GridState {
  return "counts" in state;
}

function countsOf(state: LayoutState): number[] {
  if (!isGrid(state)) return state.buckets.map((chain) => chain.length);
  const counts: number[] = [];
  for (const [bucket, count] of state.counts) counts[bucket] = count;
  return counts;
}

/** Drops what the renderer never reads: node values and hashes, or for the grid every node. */
export function slimState(state: HashTableState, layout: Layout): LayoutState {
  const { buckets, ...rest } = state;
  if (layout === "grid") {
    const counts = buckets.flatMap((chain, b): [number, number][] => (chain.length > 0 ? [[b, chain.length]] : []));
    return { ...rest, counts };
  }
  return { ...rest, buckets: buckets.map((chain) => chain.map(({ id, key }) => ({ id, key }))) };
}

/** The frame that fits every state given: the longest chain and the longest key shown. */
export function frameOf(states: readonly LayoutState[]): Frame {
  let chainSlots = 0;
  let keyChars = 0;
  for (const state of states) {
    if (state.pipeline) keyChars = Math.max(keyChars, charCount(state.pipeline.key));
    if (isGrid(state)) continue;
    for (const chain of state.buckets) {
      chainSlots = Math.max(chainSlots, chain.length);
      for (const node of chain) keyChars = Math.max(keyChars, charCount(node.key));
    }
  }
  return { chainSlots, keyChars };
}

function topRows(state: LayoutState, keyW: number): { items: SceneItem[]; width: number } {
  const items: SceneItem[] = [];
  const boxes = [
    { name: "key", label: "key", w: keyW, text: state.pipeline?.key },
    { name: "hashCode", label: "hashCode()", w: HEX_W, text: state.pipeline?.hashCode },
    { name: "spread", label: "spread", w: HEX_W, text: state.pipeline?.spread },
    { name: "index", label: "index", w: INDEX_W, text: state.pipeline ? String(state.pipeline.index) : undefined },
  ];
  let x = 0;
  boxes.forEach((box, i) => {
    if (state.pipeline) {
      items.push({ id: `pl:${box.name}`, kind: "label", x, y: 0, w: box.w, h: LABEL_H, text: box.label });
      items.push({
        id: `p:${box.name}`,
        kind: "pipeline",
        x,
        y: PIPELINE_Y,
        w: box.w,
        h: BOX_H,
        text: fit(box.text ?? ""),
        emphasis: box.name === "index" ? "focus" : "none",
      });
      if (i < boxes.length - 1) {
        items.push({ id: `l:p:${box.name}`, kind: "link", x: x + box.w, y: PIPELINE_Y, w: LINK_W, h: BOX_H });
      }
    }
    x += box.w + (i < boxes.length - 1 ? LINK_W : 0);
  });
  const pipelineWidth = x;

  x = 0;
  for (const [name, words] of [
    ["capacity", `${state.capacity} buckets`],
    ["size", `size ${state.size}`],
    ["threshold", `threshold ${state.threshold}`],
  ] as const) {
    // Fixed words and a number: never long enough to need cutting, and never cut mid-number.
    const text = words;
    const w = Math.ceil(Array.from(text).length * CHAR_W);
    items.push({ id: `s:${name}`, kind: "label", x, y: STATS_Y, w, h: LABEL_H, text });
    x += w + 16;
  }
  return { items, width: Math.max(pipelineWidth, x - 16) };
}

function layoutChains(state: ChainsState, frame: Frame): Scene {
  const nodeW = boxWidth(frame.keyChars);
  const top = topRows(state, nodeW);
  const items = top.items;
  const rows = Math.min(state.capacity, ROWS_PER_COLUMN);
  const columnW = BUCKET_W + frame.chainSlots * (LINK_W + nodeW);
  const columns = Math.ceil(state.capacity / ROWS_PER_COLUMN);

  for (let b = 0; b < state.capacity; b++) {
    const columnX = Math.floor(b / ROWS_PER_COLUMN) * (columnW + COLUMN_GAP);
    const y = TABLE_Y + (b % ROWS_PER_COLUMN) * ROW_PITCH;
    const bucketId = `b:${b}`;
    const focused = state.focus?.bucket === b;
    items.push({
      id: bucketId,
      kind: "bucket",
      x: columnX,
      y,
      w: BUCKET_W,
      h: BOX_H,
      text: String(b),
      emphasis: focused ? "focus" : "none",
    });
    let fromId = bucketId;
    let x = columnX + BUCKET_W;
    for (const node of state.buckets[b] ?? []) {
      items.push({ id: `l:${fromId}`, kind: "link", x, y, w: LINK_W, h: BOX_H });
      x += LINK_W;
      let emphasis: SceneItem["emphasis"] = "none";
      if (state.focus?.node === node.id) emphasis = state.pipeline?.key === node.key ? "new" : "focus";
      items.push({ id: node.id, kind: "node", x, y, w: nodeW, h: BOX_H, text: fit(node.key), emphasis });
      fromId = node.id;
      x += nodeW;
    }
  }

  const tableW = columns * columnW + (columns - 1) * COLUMN_GAP;
  return {
    width: Math.max(top.width, tableW),
    height: TABLE_Y + Math.max(rows, 1) * ROW_PITCH - (ROW_PITCH - BOX_H),
    items,
  };
}

function layoutGrid(state: LayoutState, frame: Frame): Scene {
  const top = topRows(state, boxWidth(frame.keyChars));
  const items = top.items;
  const counts = countsOf(state);
  const rows = Math.ceil(state.capacity / GRID_COLUMNS);
  let longest = 0;
  for (let b = 0; b < state.capacity; b++) {
    const count = counts[b] ?? 0;
    longest = Math.max(longest, count);
    items.push({
      id: `b:${b}`,
      kind: "bucket",
      x: (b % GRID_COLUMNS) * CELL_PITCH,
      y: TABLE_Y + Math.floor(b / GRID_COLUMNS) * CELL_PITCH,
      w: CELL,
      h: CELL,
      count,
      emphasis: state.focus?.bucket === b ? "focus" : "none",
    });
  }

  const legendY = TABLE_Y + rows * CELL_PITCH + 8;
  let x = 0;
  HEAT_BANDS.forEach((band, i) => {
    const text = BAND_LABELS[i]!;
    const w = 18 + Math.ceil(Array.from(text).length * CHAR_W);
    items.push({ id: `legend:${band}`, kind: "label", x, y: legendY, w, h: LABEL_H, text, count: band });
    x += w + 14;
  });
  const longestText = `longest ${longest}`;
  const longestW = Math.ceil(Array.from(longestText).length * CHAR_W);
  items.push({ id: "s:longest", kind: "label", x: x + 10, y: legendY, w: longestW, h: LABEL_H, text: longestText });
  x += 10 + longestW;

  return {
    width: Math.max(top.width, GRID_COLUMNS * CELL_PITCH - (CELL_PITCH - CELL), x),
    height: legendY + LABEL_H,
    items,
  };
}

/**
 * Lays out one state. Pure and deterministic. Ids are stable across steps: `b:<index>` for a
 * bucket, the node's own id for a node, `l:<fromId>` for the link out of a bucket or node.
 * `chains` draws the buckets as columns of 16 with chains running right and the key pipeline
 * above; `grid` draws 32 buckets a row, coloured by chain length.
 */
export function layoutHashTable(state: LayoutState, layout: Layout, frame: Frame = frameOf([state])): Scene {
  if (layout === "grid") return layoutGrid(state, frame);
  if (isGrid(state)) throw new Error("the chains layout needs the nodes, but this state holds only counts");
  return layoutChains(state, frame);
}

/** Lays out every state of a trace in one frame, and gives each scene the size of the largest. */
export function layoutTrace(states: readonly LayoutState[], layout: Layout): Scene[] {
  const frame = frameOf(states);
  const scenes = states.map((state) => layoutHashTable(state, layout, frame));
  const width = Math.max(0, ...scenes.map((s) => s.width));
  const height = Math.max(0, ...scenes.map((s) => s.height));
  return scenes.map((scene) => ({ ...scene, width, height }));
}
