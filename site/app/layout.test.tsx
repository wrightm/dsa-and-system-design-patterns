import { DocsLayout } from "fumadocs-ui/layouts/docs";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { Provider } from "../components/Provider";
import { source } from "../lib/source";
import Layout, { metadata } from "./layout";

vi.mock("../.source/server", () => import("../test/docs"));

type Element = ReactElement<Record<string, unknown> & { children: Element }>;

describe("the layout", () => {
  const html = Layout({ children: <p>page</p> }) as Element;
  const body = html.props.children;
  const provider = body.props.children;
  const docs = provider.props.children;

  it("is a British English document, allowed to differ from the server for the theme", () => {
    expect(html.type).toBe("html");
    expect(html.props).toMatchObject({ lang: "en-GB", suppressHydrationWarning: true });
    expect(body.type).toBe("body");
    expect(body.props.className).toBe("flex min-h-screen flex-col");
  });

  it("puts the page in the docs layout, inside the site's provider", () => {
    expect(provider.type).toBe(Provider);
    expect(docs.type).toBe(DocsLayout);
    expect(docs.props).toEqual({
      tree: source.getPageTree(),
      nav: { title: "DSA and system design patterns in Java" },
      githubUrl: "https://github.com/wrightm/dsa-and-system-design-patterns",
      children: <p>page</p>,
    });
  });

  it("titles pages after the site, under the site's address", () => {
    expect(metadata).toEqual({
      metadataBase: new URL("https://wrightm.github.io/"),
      title: { default: "DSA and system design patterns in Java", template: "%s - DSA and system design patterns in Java" },
    });
  });
});
