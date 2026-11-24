import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";
import { isArticle } from "../../../lib/og";
import { SITE_NAME } from "../../../lib/site";
import { source } from "../../../lib/source";

// One 1200x630 link-preview image per article, written at build time.
export const dynamic = "force-static";

const INDIGO = "#3f51b5";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const page = source.getPage(slug.slice(0, -1));
  if (!page || !isArticle(page)) notFound();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "#ffffff",
          borderTop: `24px solid ${INDIGO}`,
          color: "#1a1b2e",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          <div style={{ fontSize: 60, fontWeight: 700, lineHeight: 1.15 }}>{page.data.title}</div>
          <div style={{ fontSize: 30, lineHeight: 1.4, color: "#4a4d68" }}>{page.data.summary ?? ""}</div>
        </div>
        <div style={{ fontSize: 28, color: INDIGO }}>{SITE_NAME}</div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}

export function generateStaticParams() {
  return source
    .getPages()
    .filter(isArticle)
    .map((page) => ({ slug: [...page.slugs, "image.png"] }));
}
