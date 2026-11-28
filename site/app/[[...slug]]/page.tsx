import { DocsBody, DocsPage } from "fumadocs-ui/layouts/docs/page";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMDXComponents } from "../../mdx-components";
import { isArticle, ogImagePath } from "../../lib/og";
import { SITE_NAME, SITE_URL } from "../../lib/site";
import { source } from "../../lib/source";

type Props = { params: Promise<{ slug?: string[] }> };

export default async function Page({ params }: Props) {
  const page = source.getPage((await params).slug);
  if (!page) notFound();
  const Body = page.data.body;
  // The Markdown carries its own `# H1`, so the page renders no separate title and the
  // table of contents starts below it.
  return (
    <DocsPage toc={page.data.toc.filter((item) => item.depth > 1)}>
      <DocsBody>
        <Body components={getMDXComponents()} />
      </DocsBody>
    </DocsPage>
  );
}

export function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = source.getPage((await params).slug);
  if (!page) notFound();
  const image = isArticle(page) ? `${SITE_URL}${ogImagePath(page)}` : undefined;
  return {
    title: page.url === "/" ? { absolute: SITE_NAME } : page.data.title,
    description: page.data.description,
    openGraph: image ? { images: { url: image, width: 1200, height: 630 } } : undefined,
    twitter: image ? { card: "summary_large_image", images: image } : undefined,
  };
}
