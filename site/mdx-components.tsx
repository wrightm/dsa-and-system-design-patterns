import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import { Animation } from "./components/Animation";
import { Mermaid } from "./components/Mermaid";

/** Components the compiled Markdown renders with. Remark plugins emit the custom ones by name. */
export function getMDXComponents(components?: MDXComponents) {
  return { ...defaultMdxComponents, Mermaid, Animation, ...components } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;
