/** Colours and fonts the hash table renderer draws with. */
export type Palette = {
  font: string;
  text: string;
  muted: string;
  bucketFill: string;
  bucketStroke: string;
  nodeFill: string;
  nodeStroke: string;
  link: string;
  /** Stroke of a focused bucket or a node being compared (also dashed, so it does not rely on colour). */
  focus: string;
  /** Fill and stroke of the node holding the key being put (also a thick stroke and bold text). */
  newFill: string;
  newStroke: string;
  pipelineFill: string;
  pipelineStroke: string;
  /** One colour per band of `HEAT_BANDS`, from empty to long chains. */
  heat: readonly [string, string, string, string, string];
};

const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace";

/** Fixed colours on white, for stills and video. */
export const LIGHT: Palette = {
  font: MONO,
  text: "#1f2937",
  muted: "#6b7280",
  bucketFill: "#f3f4f6",
  bucketStroke: "#9ca3af",
  nodeFill: "#ffffff",
  nodeStroke: "#6b7280",
  link: "#6b7280",
  focus: "#b45309",
  newFill: "#e8eaf6",
  newStroke: "#3f51b5",
  pipelineFill: "#f9fafb",
  pipelineStroke: "#9ca3af",
  heat: ["#f3f4f6", "#c5cae9", "#7986cb", "#3f51b5", "#1a237e"],
};

/** CSS variables from app/global.css, which follow the site's light and dark themes. */
export const THEMED: Palette = {
  font: MONO,
  text: "var(--ht-text)",
  muted: "var(--ht-muted)",
  bucketFill: "var(--ht-bucket-fill)",
  bucketStroke: "var(--ht-bucket-stroke)",
  nodeFill: "var(--ht-node-fill)",
  nodeStroke: "var(--ht-node-stroke)",
  link: "var(--ht-link)",
  focus: "var(--ht-focus)",
  newFill: "var(--ht-new-fill)",
  newStroke: "var(--ht-new-stroke)",
  pipelineFill: "var(--ht-pipeline-fill)",
  pipelineStroke: "var(--ht-pipeline-stroke)",
  heat: ["var(--ht-heat-0)", "var(--ht-heat-1)", "var(--ht-heat-2)", "var(--ht-heat-3)", "var(--ht-heat-4)"],
};
