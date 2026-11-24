/** Mirrors the JSON the Java trace recorder writes (version 1). */

export type Node = { id: string; key: string; value: string; hash: string };

export type Focus = { bucket: number; node: string | null };

export type Pipeline = { key: string; hashCode: string; spread: string; index: number };

export type HashTableState = {
  capacity: number;
  size: number;
  threshold: number;
  buckets: Node[][];
  focus: Focus | null;
  pipeline: Pipeline | null;
};

export type SourceRef = { file: string; line: number };

export type Step = { caption: string; source: SourceRef | null; state: HashTableState };

export type Trace = {
  version: 1;
  id: string;
  title: string;
  kind: "hash-table";
  layout: "chains" | "grid";
  steps: Step[];
};
