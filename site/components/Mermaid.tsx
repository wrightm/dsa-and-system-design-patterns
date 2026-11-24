"use client";

import { use, useId, useSyncExternalStore } from "react";

// Renders a Mermaid diagram in the browser. Without JavaScript the diagram source shows instead.
export function Mermaid({ chart }: { chart: string }) {
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  if (!isClient) return <pre className="mermaid-source">{chart}</pre>;
  return <MermaidDiagram chart={chart} />;
}

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

function MermaidDiagram({ chart }: { chart: string }) {
  const id = `mermaid-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const theme = useSyncExternalStore<"dark" | "default">(
    subscribeTheme,
    () => (document.documentElement.classList.contains("dark") ? "dark" : "default"),
    () => "default",
  );
  const { default: mermaid } = use(once("mermaid", () => import("mermaid")));
  mermaid.initialize({ startOnLoad: false, fontFamily: "inherit", theme });
  const { svg } = use(once(`${theme}:${chart}`, () => mermaid.render(`${id}-${theme}`, chart)));
  return <div className="mermaid-diagram" dangerouslySetInnerHTML={{ __html: svg }} />;
}
