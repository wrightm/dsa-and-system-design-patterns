import path from "node:path";
import { nodeTypes } from "@mdx-js/mdx";
import { remarkMdxMermaid } from "fumadocs-core/mdx-plugins/remark-mdx-mermaid";
import { pageSchema } from "fumadocs-core/source/schema";
import { defineConfig, defineDocs } from "fumadocs-mdx/config";
import rehypeRaw from "rehype-raw";
import { z } from "zod";
import { remarkPageLinks } from "./lib/page-links";

const DOCS_DIR = "content/docs";

// Articles stay plain `.md`, so fumadocs-mdx compiles them with MDX's `md` format (CommonMark
// plus GFM): `<` and `{` in prose are text, never JSX or expressions.
export const docs = defineDocs({
  dir: DOCS_DIR,
  docs: {
    schema: pageSchema.extend({
      summary: z.string().optional(),
      date: z.string().optional(),
      series: z.number().optional(),
      tags: z.array(z.string()).optional(),
    }),
  },
});

export default defineConfig({
  mdxOptions: {
    // Run before the preset so links are site URLs before Fumadocs reads them.
    remarkPlugins: (preset) => [[remarkPageLinks, { docsDir: path.resolve(DOCS_DIR) }], remarkMdxMermaid, ...preset],
    // Raw HTML such as `<br>` in tables, as GitHub renders it. MDX nodes pass through untouched.
    rehypePlugins: (preset) => [[rehypeRaw, { passThrough: nodeTypes }], ...preset],
  },
});
