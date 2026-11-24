import path from "node:path";
import { nodeTypes } from "@mdx-js/mdx";
import { remarkMdxMermaid } from "fumadocs-core/mdx-plugins/remark-mdx-mermaid";
import { pageSchema } from "fumadocs-core/source/schema";
import { defineConfig, defineDocs } from "fumadocs-mdx/config";
import rehypeRaw from "rehype-raw";
import { z } from "zod";
import { remarkPageLinks } from "./lib/page-links";
import { remarkAnimations } from "./lib/remark-animations";

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
    // Run before the preset: links must be site URLs before Fumadocs reads them, and an
    // animation image must be an <Animation> before the preset's remarkImage makes it an import.
    remarkPlugins: (preset) => [
      [remarkPageLinks, { docsDir: path.resolve(DOCS_DIR) }],
      [
        remarkAnimations,
        {
          pagePathOf: (file: string) => path.relative(path.resolve(DOCS_DIR), file),
          tracesDir: path.resolve("content/traces"),
        },
      ],
      remarkMdxMermaid,
      ...preset,
    ],
    // Raw HTML such as `<br>` in tables, as GitHub renders it. MDX nodes pass through untouched.
    rehypePlugins: (preset) => [[rehypeRaw, { passThrough: nodeTypes }], ...preset],
  },
});
