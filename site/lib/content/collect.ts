import fs from "node:fs";
import path from "node:path";
import { stringify } from "yaml";
import { type Article, BRANCH, findArticles, GITHUB, MODULES, pagePath } from "./articles";
import { catalogueFiles, catalogueProgress, catalogueTitle } from "./catalogue";
import { animationImages, buildPages, rewriteLinks } from "./links";
import { validateTrace } from "../trace/validate";

export type CollectOptions = {
  repoRoot: string;
  /** Where `content-src/` lives, and where `content/` and `public/generated/` are written. */
  siteDir: string;
};

function frontMatter(fields: Record<string, unknown>): string {
  const clean = Object.fromEntries(
    Object.entries(fields).filter(
      ([, v]) => v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0),
    ),
  );
  return `---\n${stringify(clean, { lineWidth: 0 })}---\n\n`;
}

const byTitle = (a: Article, b: Article) => a.title.toLowerCase().localeCompare(b.title.toLowerCase());

/**
 * Collects published articles, their traces and the generated pages into `<siteDir>/content/`
 * and `<siteDir>/public/generated/`. Returns the articles it collected, in series order.
 */
export function collect({ repoRoot, siteDir }: CollectOptions): Article[] {
  const docs = path.join(siteDir, "content", "docs");
  const traces = path.join(siteDir, "content", "traces");
  const sources = path.join(siteDir, "content", "sources");
  const stills = path.join(siteDir, "public", "generated", "animations");
  for (const dir of [path.join(siteDir, "content"), path.join(siteDir, "public", "generated")]) {
    fs.rmSync(dir, { recursive: true, force: true });
  }

  const write = (target: string, text: string) => {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, text, "utf8");
  };
  const writeDoc = (docPath: string, text: string) => write(path.join(docs, docPath), text);

  const articles = findArticles(repoRoot);
  const pages = buildPages(articles, repoRoot);
  const inSeries = [...articles].sort((a, b) => a.series - b.series);

  for (const article of articles) {
    const source = path.join(repoRoot, article.sourcePath);
    const docPath = pagePath(article);
    const folder = path.posix.dirname(article.sourcePath);
    const body = rewriteLinks(article.body, source, docPath, pages, repoRoot);
    const footer =
      "\n---\n\n" +
      `*Article ${article.series} in [the series](../series.md), published ${article.date}. ` +
      "The code and tests live beside this article in " +
      `[\`${folder}\`](${GITHUB}/tree/${BRANCH}/${folder}). ` +
      `Found a mistake or have a question? [Open an issue](${GITHUB}/issues).*\n`;
    const header = frontMatter({
      title: article.title,
      description: article.summary,
      summary: article.summary,
      date: article.date,
      series: article.series,
      tags: article.tags,
    });
    writeDoc(docPath, header + body.replace(/\n+$/, "") + "\n" + footer);
    for (const name of new Set(animationImages(article.body))) {
      if (!fs.existsSync(path.join(path.dirname(source), "animations", `${name}.trace.json`))) {
        throw new Error(`${article.sourcePath}: no trace for animations/${name}.svg`);
      }
    }
    collectTraces(article, path.dirname(source));
  }

  function collectTraces(article: Article, articleDir: string) {
    const animations = path.join(articleDir, "animations");
    if (!fs.existsSync(animations)) return;
    const slugDir = `${article.module}/${article.slug}`;
    for (const file of fs.readdirSync(animations).sort()) {
      if (!file.endsWith(".trace.json")) continue;
      const name = file.slice(0, -".trace.json".length);
      const shown = path.relative(repoRoot, path.join(animations, file)).split(path.sep).join("/");
      const text = fs.readFileSync(path.join(animations, file), "utf8");
      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch (error) {
        throw new Error(`${shown}: not valid JSON (${(error as Error).message})`);
      }
      const trace = validateTrace(json, shown);
      write(path.join(traces, slugDir, `${name}.json`), text);
      for (const ref of new Set(trace.steps.flatMap((s) => (s.source ? [s.source.file] : [])))) {
        if (/[/\\]|\.\./.test(ref)) {
          throw new Error(`${shown}: source.file must be a plain file name, found ${JSON.stringify(ref)}`);
        }
        const from = path.join(articleDir, ref);
        if (!fs.existsSync(from)) throw new Error(`${shown}: source file not found beside the article: ${ref}`);
        write(path.join(sources, slugDir, ref), fs.readFileSync(from, "utf8"));
      }
      const still = path.join(animations, `${name}.svg`);
      if (fs.existsSync(still)) {
        const to = path.join(stills, slugDir, `${name}.svg`);
        fs.mkdirSync(path.dirname(to), { recursive: true });
        fs.copyFileSync(still, to);
      }
    }
  }

  // One index per domain.
  for (const [module, info] of Object.entries(MODULES)) {
    const mine = articles.filter((a) => a.module === module).sort(byTitle);
    const lines = [
      frontMatter({ title: info.title, description: info.description }),
      `# ${info.title}\n`,
      `${info.description}\n`,
    ];
    if (mine.length > 0) {
      lines.push("## Articles\n");
      lines.push(...mine.map((a) => `- **[${a.title}](${a.slug}.md)**: ${a.summary}`));
      lines.push("");
    } else {
      lines.push("No articles published here yet.\n");
    }
    if (info.catalogue) lines.push(`See [what is planned for this domain](../catalogue/${info.catalogue}).\n`);
    writeDoc(`${module}/index.md`, lines.join("\n"));
  }

  // Series page.
  const seriesLines = [
    frontMatter({ title: "The series", description: "Every article in the order it was published." }),
    "# The series\n",
    "Every article in the order it was published. Topics are written as they come up, " +
      "so this is a reading order by date, not a curriculum. Each article says what it assumes.\n",
    "| # | Article | Domain | Published |",
    "|---|---|---|---|",
    ...inSeries.map(
      (a) =>
        `| ${a.series} | **[${a.title}](${pagePath(a)})**<br>${a.summary} ` +
        `| [${MODULES[a.module]!.title}](${a.module}/index.md) | ${a.date} |`,
    ),
  ];
  writeDoc("series.md", seriesLines.join("\n") + "\n");

  // Home, with the latest five articles, and about.
  const latest = [...inSeries].reverse().slice(0, 5);
  const items = latest.map((a) => `- **[${a.title}](${pagePath(a)})**<br>${a.summary}`).join("\n");
  const home = fs.readFileSync(path.join(siteDir, "content-src", "index.md"), "utf8");
  writeDoc("index.md", home.replace("<!-- LATEST -->", () => items || "Nothing published yet."));
  writeDoc("about.md", fs.readFileSync(path.join(siteDir, "content-src", "about.md"), "utf8"));

  // Catalogue.
  const topics = path.join(repoRoot, "topics");
  if (!fs.existsSync(path.join(topics, "README.md"))) throw new Error("topics/README.md is missing");
  const progress = catalogueProgress(repoRoot);
  for (const file of catalogueFiles(repoRoot)) {
    const source = path.join(topics, file);
    const text = fs.readFileSync(source, "utf8");
    const docPath = `catalogue/${file}`;
    writeDoc(
      docPath,
      frontMatter({ title: catalogueTitle(text) }) + rewriteLinks(text, source, docPath, pages, repoRoot),
    );
  }
  const done = progress.reduce((n, p) => n + p.done, 0);
  const total = progress.reduce((n, p) => n + p.total, 0);
  writeDoc(
    "catalogue/index.md",
    [
      frontMatter({ title: "Catalogue", description: "Every planned topic and how far along it is." }),
      "# Topic catalogue\n",
      `**${done} of ${total} topics published.** There is no required order: ` +
        "topics are written as they come up in coding challenges and day-to-day work.\n",
      "| Domain | Published | Planned |",
      "|---|---|---|",
      ...progress.map((p) => `| [${p.title}](${p.file}) | ${p.done} | ${p.total} |`),
      "",
      "A ticked entry links to its article. **needs** lists what helps to know first, " +
        "and **wild** names real implementations worth reading alongside the topic.\n",
      `The catalogue is edited in the [repository](${GITHUB}/tree/${BRANCH}/topics). ` +
        "If something is missing, open an issue or a pull request.\n",
    ].join("\n"),
  );

  return inSeries;
}
