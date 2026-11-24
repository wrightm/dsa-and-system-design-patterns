import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import { Mermaid } from "./components/Mermaid";

/** Components the compiled Markdown renders with. Remark plugins emit the custom ones by name. */
export function getMDXComponents(components?: MDXComponents) {
  return { ...defaultMdxComponents, Mermaid, ...components } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;
