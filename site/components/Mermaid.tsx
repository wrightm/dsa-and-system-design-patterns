"use client";

import { use, useId, useSyncExternalStore } from "react";

// Renders a Mermaid diagram in the browser. Without JavaScript, or when Mermaid cannot draw the
// diagram, the diagram source shows instead; an invalid diagram never breaks the rest of the page.
export function Mermaid({ chart }: { chart: string }) {
  const isClient = useSyncExternalStore(
    // Stryker disable next-line ArrowFunction: this store never changes, so React has nothing to unsubscribe.
    () => () => {},
    () => true,
    // Stryker disable next-line ArrowFunction: undefined is falsy too, so the server still renders the source.
    () => false,
  );
  if (!isClient) return <Source chart={chart} />;
  return <MermaidDiagram chart={chart} />;
}

function Source({ chart, failed = false }: { chart: string; failed?: boolean }) {
  return (
    <pre className="mermaid-source" data-mermaid={failed ? "failed" : undefined}>
      {chart}
    </pre>
  );
}

type MermaidApi = (typeof import("mermaid"))["default"];

let loading: Promise<MermaidApi | null> | undefined;

/** Mermaid, loaded once for the page, or null when it cannot load. */
function loadMermaid(): Promise<MermaidApi | null> {
  loading ??= import("mermaid").then(
    (m) => m.default,
    () => null,
  );
  return loading;
}

const drawings = new Map<string, ReturnType<typeof draw>>();

function subscribeTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributeFilter: ["class"] });
  return () => observer.disconnect();
}

let renders = 0;

/**
 * The SVG for a chart and the id Mermaid gave it, or null when Mermaid cannot load or the chart
 * does not parse.
 */
async function draw(mermaid: MermaidApi, chart: string): Promise<{ svg: string; id: string } | null> {
  try {
    // Parse first: a failed render leaves Mermaid's error graphic in the document.
    if (!(await mermaid.parse(chart, { suppressErrors: true }))) return null;
    const id = `mermaid-render-${++renders}`;
    return { svg: (await mermaid.render(id, chart)).svg, id };
  } catch {
    return null;
  }
}

function MermaidDiagram({ chart }: { chart: string }) {
  const id = `mermaid-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  // No server snapshot: Mermaid only renders this once it is on the client, never on the server
  // or while hydrating.
  const theme = useSyncExternalStore<"dark" | "default">(subscribeTheme, () =>
    document.documentElement.classList.contains("dark") ? "dark" : "default",
  );
  const mermaid = use(loadMermaid());
  if (mermaid === null) return <Source chart={chart} failed />;
  mermaid.initialize({ startOnLoad: false, fontFamily: "inherit", theme });
  // Cached by chart, not by instance: React may retry a suspended first render with a new id.
  const key = `${theme}:${chart}`;
  if (!drawings.has(key)) drawings.set(key, draw(mermaid, chart));
  const drawn = use(drawings.get(key)!);
  if (drawn === null) return <Source chart={chart} failed />;
  // Swap in this instance's id, so two identical charts on a page never share SVG ids.
  return <div className="mermaid-diagram" dangerouslySetInnerHTML={{ __html: drawn.svg.replaceAll(drawn.id, id) }} />;
}
