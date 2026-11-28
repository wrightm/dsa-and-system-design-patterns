// A small docs collection built through fumadocs-mdx's real server runtime, in place of the
// `.source/server` that `fumadocs-mdx` generates from content/docs at build time. vitest.config.ts
// points every import of that module here, so the real `loader` in lib/source runs over pages whose
// content is known, and the tests need neither `pnpm collect` nor the generated folder.
import { server } from "fumadocs-mdx/runtime/server";
import type { InternalTypeConfig } from "fumadocs-mdx/runtime/types";
import type { MDXComponents } from "mdx/types";
import { createElement } from "react";
import type * as Config from "../source.config";

type Heading = { title: string; url: string; depth: number };

function doc(frontmatter: Record<string, unknown>, toc: Heading[] = []) {
  // The compiled Markdown: its own H1, and the names of the components it was handed.
  const Body = ({ components }: { components?: MDXComponents }) =>
    createElement(
      "article",
      { "data-components": Object.keys(components ?? {}).sort().join(" ") },
      createElement("h1", null, String(frontmatter.title)),
    );
  return { default: Body, frontmatter, toc, structuredData: { headings: [], contents: [] } };
}

export const PAGES = {
  "index.md": doc({ title: "Home", description: "Patterns in Java." }),
  "about.md": doc({ title: "About" }),
  "data-structures/index.md": doc({ title: "Data structures" }),
  "data-structures/hashmap.md": doc(
    { title: "Hash map", description: "How a hash map works.", series: 1, summary: "Buckets, hashing and resizing." },
    [
      { title: "Hash map", url: "#hash-map", depth: 1 },
      { title: "Buckets", url: "#buckets", depth: 2 },
      { title: "Chains", url: "#chains", depth: 3 },
    ],
  ),
  "data-structures/no-summary.md": doc({ title: "No summary", series: 2 }),
};

// Typed as the generated module types it, so pages carry the site's own front matter.
export const docs = await server<typeof Config, InternalTypeConfig & { DocData: {} }>().docs("docs", "content/docs", {}, PAGES);
