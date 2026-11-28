import { DocsBody, DocsPage } from "fumadocs-ui/layouts/docs/page";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { getMDXComponents } from "../../mdx-components";
import Page, { generateMetadata, generateStaticParams } from "./page";

const props = (...slug: string[]) => ({ params: Promise.resolve({ slug: slug.length === 0 ? undefined : slug }) });
type Element = ReactElement<{ children: Element; toc?: unknown; components?: unknown }>;
const NOT_FOUND = { digest: "NEXT_HTTP_ERROR_FALLBACK;404" };

describe("a page", () => {
  it("renders its compiled Markdown in the docs page, with the site's MDX components", async () => {
    const page = (await Page(props("data-structures", "hashmap"))) as Element;
    expect(page.type).toBe(DocsPage);
    const body = page.props.children;
    expect(body.type).toBe(DocsBody);
    expect(body.props.children.props.components).toEqual(getMDXComponents());
    expect(renderToStaticMarkup(body.props.children)).toBe(
      `<article data-components="${Object.keys(getMDXComponents()).sort().join(" ")}"><h1>Hash map</h1></article>`,
    );
  });

  it("starts the table of contents below the Markdown's own H1", async () => {
    const page = (await Page(props("data-structures", "hashmap"))) as Element;
    expect(page.props.toc).toEqual([
      { title: "Buckets", url: "#buckets", depth: 2 },
      { title: "Chains", url: "#chains", depth: 3 },
    ]);
  });

  it("is not found when no page has the path", async () => {
    await expect(Page(props("nope"))).rejects.toMatchObject(NOT_FOUND);
  });

  it("is generated for every page", () => {
    expect(generateStaticParams()).toEqual(
      expect.arrayContaining([
        { slug: [] },
        { slug: ["about"] },
        { slug: ["data-structures"] },
        { slug: ["data-structures", "hashmap"] },
        { slug: ["data-structures", "no-summary"] },
      ]),
    );
    expect(generateStaticParams()).toHaveLength(5);
  });
});

describe("a page's metadata", () => {
  it("gives the home page the site's name alone", async () => {
    expect(await generateMetadata(props())).toEqual({
      title: { absolute: "DSA and system design patterns in Java" },
      description: "Patterns in Java.",
      openGraph: undefined,
      twitter: undefined,
    });
  });

  it("titles any other page, with no preview image unless it is an article", async () => {
    expect(await generateMetadata(props("about"))).toEqual({
      title: "About",
      description: undefined,
      openGraph: undefined,
      twitter: undefined,
    });
  });

  it("gives an article its 1200x630 preview image, as a large card", async () => {
    const image = "https://wrightm.github.io/og/data-structures/hashmap/image.png";
    expect(await generateMetadata(props("data-structures", "hashmap"))).toEqual({
      title: "Hash map",
      description: "How a hash map works.",
      openGraph: { images: { url: image, width: 1200, height: 630 } },
      twitter: { card: "summary_large_image", images: image },
    });
  });

  it("is not found when no page has the path", async () => {
    await expect(generateMetadata(props("nope"))).rejects.toMatchObject(NOT_FOUND);
  });
});
