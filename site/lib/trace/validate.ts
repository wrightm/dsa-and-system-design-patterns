import type { Focus, HashTableState, Node, Pipeline, SourceRef, Step, Trace } from "./types";

class Invalid extends Error {}

type Obj = Record<string, unknown>;

function obj(value: unknown, where: string): Obj {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Invalid(`${where} must be an object`);
  }
  return value as Obj;
}

function str(o: Obj, key: string, where: string): string {
  if (typeof o[key] !== "string") throw new Invalid(`${where}.${key} must be a string`);
  return o[key];
}

function int(o: Obj, key: string, where: string): number {
  if (!Number.isInteger(o[key])) throw new Invalid(`${where}.${key} must be an integer`);
  return o[key] as number;
}

function node(value: unknown, where: string): Node {
  const o = obj(value, where);
  return {
    id: str(o, "id", where),
    key: str(o, "key", where),
    value: str(o, "value", where),
    hash: str(o, "hash", where),
  };
}

function focus(value: unknown, where: string): Focus | null {
  if (value === null) return null;
  const o = obj(value, where);
  if (o.node !== null && typeof o.node !== "string") throw new Invalid(`${where}.node must be a string or null`);
  return { bucket: int(o, "bucket", where), node: o.node };
}

function pipeline(value: unknown, where: string): Pipeline | null {
  if (value === null) return null;
  const o = obj(value, where);
  return {
    key: str(o, "key", where),
    hashCode: str(o, "hashCode", where),
    spread: str(o, "spread", where),
    index: int(o, "index", where),
  };
}

function state(value: unknown, where: string): HashTableState {
  const o = obj(value, where);
  if (!Array.isArray(o.buckets)) throw new Invalid(`${where}.buckets must be an array`);
  const buckets = o.buckets.map((chain, b) => {
    if (!Array.isArray(chain)) throw new Invalid(`${where}.buckets[${b}] must be an array`);
    return chain.map((n, i) => node(n, `${where}.buckets[${b}][${i}]`));
  });
  if (!("focus" in o)) throw new Invalid(`${where}.focus is missing`);
  if (!("pipeline" in o)) throw new Invalid(`${where}.pipeline is missing`);
  return {
    capacity: int(o, "capacity", where),
    size: int(o, "size", where),
    threshold: int(o, "threshold", where),
    buckets,
    focus: focus(o.focus, `${where}.focus`),
    pipeline: pipeline(o.pipeline, `${where}.pipeline`),
  };
}

function source(value: unknown, where: string): SourceRef | null {
  if (value === null) return null;
  const o = obj(value, where);
  return { file: str(o, "file", where), line: int(o, "line", where) };
}

function step(value: unknown, where: string): Step {
  const o = obj(value, where);
  if (!("source" in o)) throw new Invalid(`${where}.source is missing`);
  if (!("state" in o)) throw new Invalid(`${where}.state is missing`);
  return {
    caption: str(o, "caption", where),
    source: source(o.source, `${where}.source`),
    state: state(o.state, `${where}.state`),
  };
}

/** Checks parsed JSON against the version 1 trace shape. Errors start with the file name. */
export function validateTrace(json: unknown, file: string): Trace {
  try {
    const o = obj(json, "trace");
    if (o.version !== 1) throw new Invalid(`version must be 1, found ${JSON.stringify(o.version)}`);
    if (o.kind !== "hash-table") throw new Invalid(`unknown kind ${JSON.stringify(o.kind)}`);
    if (o.layout !== "chains" && o.layout !== "grid") {
      throw new Invalid(`unknown layout ${JSON.stringify(o.layout)}`);
    }
    if (!Array.isArray(o.steps)) throw new Invalid("steps must be an array");
    return {
      version: 1,
      id: str(o, "id", "trace"),
      title: str(o, "title", "trace"),
      kind: o.kind,
      layout: o.layout,
      steps: o.steps.map((s, i) => step(s, `steps[${i}]`)),
    };
  } catch (error) {
    if (error instanceof Invalid) throw new Error(`${file}: ${error.message}`);
    throw error;
  }
}
