"use client";

import { use, useId, useSyncExternalStore } from "react";

// Renders a Mermaid diagram in the browser. Without JavaScript, or when Mermaid cannot draw the
// diagram, the diagram source shows instead; an invalid diagram never breaks the rest of the page.
export function Mermaid({ chart }: { chart: string }) {
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
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

const cache = new Map<string, Promise<unknown>>();

function once<T>(key: string, make: () => Promise<T>): Promise<T> {
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key) as Promise<T>;
}

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
async function draw(mermaid: MermaidApi | null, chart: string): Promise<{ svg: string; id: string } | null> {
  if (mermaid === null) return null;
  const id = `mermaid-render-${++renders}`;
  try {
    // Parse first: a failed render leaves Mermaid's error graphic in the document.
    if (!(await mermaid.parse(chart, { suppressErrors: true }))) return null;
    return { svg: (await mermaid.render(id, chart)).svg, id };
  } catch {
    return null;
  }
}

function MermaidDiagram({ chart }: { chart: string }) {
  const id = `mermaid-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const theme = useSyncExternalStore<"dark" | "default">(
    subscribeTheme,
    () => (document.documentElement.classList.contains("dark") ? "dark" : "default"),
    () => "default",
  );
  const mermaid = use(
    once("mermaid", () =>
      import("mermaid").then(
        (m) => m.default,
        () => null,
      ),
    ),
  );
  mermaid?.initialize({ startOnLoad: false, fontFamily: "inherit", theme });
  // Cached by chart, not by instance: React may retry a suspended first render with a new id.
  const drawn = use(once(`${theme}:${chart}`, () => draw(mermaid, chart)));
  if (drawn === null) return <Source chart={chart} failed />;
  // Swap in this instance's id, so two identical charts on a page never share SVG ids.
  return <div className="mermaid-diagram" dangerouslySetInnerHTML={{ __html: drawn.svg.replaceAll(drawn.id, id) }} />;
}
