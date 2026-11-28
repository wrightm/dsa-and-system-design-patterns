import { DocsBody, DocsPage } from "fumadocs-ui/layouts/docs/page";
import Link from "next/link";
import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import NotFound, { metadata } from "./not-found";

type Element = ReactElement<{ children: Element | Element[]; toc?: unknown; href?: string }>;

describe("the not-found page", () => {
  // In the docs page, so the layout's "Skip to content" link has its #nd-page target.
  it("is a docs page with a heading and a link home", () => {
    const page = NotFound() as Element;
    expect(page.type).toBe(DocsPage);
    expect(page.props.toc).toEqual([]);
    const body = page.props.children as Element;
    expect(body.type).toBe(DocsBody);
    const [heading, text] = body.props.children as Element[];
    expect(heading).toEqual(<h1>Page not found</h1>);
    expect(text!.type).toBe("p");
    const [before, link] = text!.props.children as unknown as [string, Element];
    expect(before).toBe("There is no page at this address. ");
    expect(link.type).toBe(Link);
    expect(link.props.href).toBe("/");
    expect(link.props.children).toBe("Go to the home page");
  });

  it("is titled for the browser tab", () => {
    expect(metadata).toEqual({ title: "Page not found" });
  });
});
