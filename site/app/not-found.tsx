import { DocsBody, DocsPage } from "fumadocs-ui/layouts/docs/page";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Page not found" };

// Inside the docs page, like every other page, so the layout's "Skip to content" link has
// its #nd-page target and the reader still has the sidebar to find their way.
export default function NotFound() {
  return (
    <DocsPage toc={[]}>
      <DocsBody>
        <h1>Page not found</h1>
        <p>
          There is no page at this address. <Link href="/">Go to the home page</Link>
        </p>
      </DocsBody>
    </DocsPage>
  );
}
