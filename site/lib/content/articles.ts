import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";

export const GITHUB = "https://github.com/wrightm/dsa-and-system-design-patterns";
export const BRANCH = "main";

export type Module = { title: string; description: string; catalogue: string | null };

/** Module directory to its title, one-line description and catalogue file. Same table as collect.py. */
export const MODULES: Record<string, Module> = {
  "data-structures": {
    title: "Data structures",
    description: "Structures built from scratch, each compared with the JDK or library version.",
    catalogue: "data-structures.md",
  },
  algorithms: {
    title: "Algorithms",
    description: "Algorithms and the problem-solving patterns coding challenges keep returning to.",
    catalogue: "algorithms.md",
  },
  concurrency: {
    title: "Concurrency",
    description: "Threads, the Java Memory Model, locks, lock-free code and executors.",
    catalogue: "concurrency.md",
  },
  "oo-design": {
    title: "Object-oriented design",
    description: "Design principles, modelling in modern Java, and low-level design case studies.",
    catalogue: "oo-design.md",
  },
  "design-patterns": {
    title: "Design patterns",
    description: "Gang of Four, architectural, enterprise application and domain-driven design patterns.",
    catalogue: "design-patterns.md",
  },
  "enterprise-integration-patterns": {
    title: "Enterprise integration patterns",
    description: "The Hohpe and Woolf messaging patterns, built in plain Java and found in real frameworks.",
    catalogue: "enterprise-integration-patterns.md",
  },
  "distributed-systems": {
    title: "Distributed systems",
    description: "Clocks, replication, partitioning, consensus, storage internals and resilience.",
    catalogue: "distributed-systems.md",
  },
  "microservices-patterns": {
    title: "Microservices patterns",
    description: "Decomposition, data management, communication, reliability and deployment patterns.",
    catalogue: "microservices-patterns.md",
  },
  "system-design": {
    title: "System design",
    description: "Worked design case studies with the trade-offs written down.",
    catalogue: "system-design.md",
  },
  "library-studies": {
    title: "Library studies",
    description: "Reading the JDK and open source libraries: the decisions made and what they cost.",
    catalogue: "library-studies.md",
  },
  challenges: {
    title: "Challenges",
    description: "Coding challenge solutions, linked to the topics they use.",
    catalogue: null,
  },
};

export type Article = {
  module: string;
  slug: string;
  title: string;
  summary: string;
  date: string;
  series: number;
  tags: string[];
  /** Repo-relative path of the README.md, with forward slashes. */
  sourcePath: string;
  body: string;
};

const FRONT_MATTER = /^---\n([\s\S]*?)\n---\n/;

export function splitFrontMatter(text: string): { meta: Record<string, unknown>; body: string } {
  const match = FRONT_MATTER.exec(text);
  if (!match) return { meta: {}, body: text };
  const meta = parse(match[1]!) as Record<string, unknown> | null;
  return { meta: meta ?? {}, body: text.slice(match[0].length) };
}

function readmes(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const found: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...readmes(full));
    else if (entry.name === "README.md") found.push(full);
  }
  return found.sort();
}

export function pagePath(article: Pick<Article, "module" | "slug">): string {
  return `${article.module}/${article.slug}.md`;
}

/** Published articles only. Throws, naming the file, when a published article is incomplete. */
export function findArticles(repoRoot: string): Article[] {
  const articles: Article[] = [];
  for (const module of Object.keys(MODULES)) {
    for (const readme of readmes(path.join(repoRoot, module, "src", "main", "java"))) {
      const { meta, body } = splitFrontMatter(fs.readFileSync(readme, "utf8"));
      if (meta.status !== "published") continue;
      const sourcePath = path.relative(repoRoot, readme).split(path.sep).join("/");
      const missing = ["title", "summary", "date", "series"].filter((key) => !meta[key]);
      if (missing.length > 0) throw new Error(`${sourcePath}: published but missing ${missing.join(", ")}`);
      articles.push({
        module,
        slug: path.basename(path.dirname(readme)),
        title: String(meta.title),
        summary: String(meta.summary),
        date: String(meta.date),
        series: Number(meta.series),
        tags: Array.isArray(meta.tags) ? meta.tags.map(String) : [],
        sourcePath,
        body,
      });
    }
  }
  const repeated = (values: string[]) => [...new Set(values.filter((v, i) => values.indexOf(v) !== i))].sort();
  const pages = repeated(articles.map(pagePath));
  if (pages.length > 0) throw new Error(`two articles map to the same page: ${pages.join(", ")}`);
  const numbers = repeated(articles.map((a) => String(a.series)));
  if (numbers.length > 0) throw new Error(`series numbers used more than once: ${numbers.join(", ")}`);
  return articles;
}
