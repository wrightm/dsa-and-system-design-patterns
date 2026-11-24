import { DocsLayout } from "fumadocs-ui/layouts/docs";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Provider } from "../components/Provider";
import { GITHUB } from "../lib/content/articles";
import { SITE_NAME, SITE_URL } from "../lib/site";
import { source } from "../lib/source";
import "./global.css";

export const metadata: Metadata = {
  metadataBase: new URL(`${SITE_URL}/`),
  title: { default: SITE_NAME, template: `%s - ${SITE_NAME}` },
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-GB" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <Provider>
          <DocsLayout tree={source.getPageTree()} nav={{ title: SITE_NAME }} githubUrl={GITHUB}>
            {children}
          </DocsLayout>
        </Provider>
      </body>
    </html>
  );
}
