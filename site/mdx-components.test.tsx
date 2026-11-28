import defaultMdxComponents from "fumadocs-ui/mdx";
import { describe, expect, it } from "vitest";
import { Animation } from "./components/Animation";
import { Mermaid } from "./components/Mermaid";
import { getMDXComponents, useMDXComponents } from "./mdx-components";

describe("MDX components", () => {
  it("are Fumadocs' defaults plus the ones the remark plugins emit", () => {
    expect(getMDXComponents()).toEqual({ ...defaultMdxComponents, Mermaid, Animation });
  });

  it("let a caller override any of them", () => {
    const a = () => null;
    const Own = () => null;
    expect(getMDXComponents({ a, Mermaid: Own })).toEqual({ ...defaultMdxComponents, a, Mermaid: Own, Animation });
  });

  it("are what MDX asks for by its hook name", () => {
    expect(useMDXComponents).toBe(getMDXComponents);
  });
});
