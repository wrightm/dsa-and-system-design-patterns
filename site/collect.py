#!/usr/bin/env python3
"""Collects published articles into site/.generated/ for MkDocs.

Articles live beside their code as README.md files with YAML front matter.
This script copies every article marked `status: published` into the docs
tree, rewrites its relative links, and generates the pages that depend on
the whole set: home, series, one index per domain, and the catalogue.

    python site/collect.py
    mkdocs build -f site/.generated/mkdocs.yml
"""

from __future__ import annotations

import os
import re
import shutil
import sys
from dataclasses import dataclass
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
OUT = SITE / ".generated"
DOCS = OUT / "docs"
GITHUB = "https://github.com/wrightm/dsa-and-system-design-patterns"
BRANCH = "main"

# module directory -> (title, one-line description, catalogue file)
MODULES = {
    "data-structures": (
        "Data structures",
        "Structures built from scratch, each compared with the JDK or library version.",
        "data-structures.md",
    ),
    "algorithms": (
        "Algorithms",
        "Algorithms and the problem-solving patterns coding challenges keep returning to.",
        "algorithms.md",
    ),
    "concurrency": (
        "Concurrency",
        "Threads, the Java Memory Model, locks, lock-free code and executors.",
        "concurrency.md",
    ),
    "oo-design": (
        "Object-oriented design",
        "Design principles, modelling in modern Java, and low-level design case studies.",
        "oo-design.md",
    ),
    "design-patterns": (
        "Design patterns",
        "Gang of Four, architectural, enterprise application and domain-driven design patterns.",
        "design-patterns.md",
    ),
    "enterprise-integration-patterns": (
        "Enterprise integration patterns",
        "The Hohpe and Woolf messaging patterns, built in plain Java and found in real frameworks.",
        "enterprise-integration-patterns.md",
    ),
    "distributed-systems": (
        "Distributed systems",
        "Clocks, replication, partitioning, consensus, storage internals and resilience.",
        "distributed-systems.md",
    ),
    "microservices-patterns": (
        "Microservices patterns",
        "Decomposition, data management, communication, reliability and deployment patterns.",
        "microservices-patterns.md",
    ),
    "system-design": (
        "System design",
        "Worked design case studies with the trade-offs written down.",
        "system-design.md",
    ),
    "library-studies": (
        "Library studies",
        "Reading the JDK and open source libraries: the decisions made and what they cost.",
        "library-studies.md",
    ),
    "challenges": (
        "Challenges",
        "Coding challenge solutions, linked to the topics they use.",
        None,
    ),
}

FRONT_MATTER = re.compile(r"\A---\n(.*?)\n---\n", re.DOTALL)
# [text](target) and ![alt](target); target has no spaces or closing parenthesis.
LINK = re.compile(r"(!?\[[^\]]*\])\(([^)\s]+)\)")
FENCE = re.compile(r"^(```|~~~)")
CHECKBOX = re.compile(r"^- \[( |x)\] ", re.MULTILINE)


@dataclass
class Article:
    source: Path  # absolute path of the README.md
    module: str
    slug: str
    meta: dict
    body: str

    @property
    def doc_path(self) -> str:
        """Path of the page inside the docs tree."""
        return f"{self.module}/{self.slug}.md"

    @property
    def title(self) -> str:
        return str(self.meta["title"])

    @property
    def summary(self) -> str:
        return str(self.meta.get("summary") or "")

    @property
    def series(self) -> int:
        return int(self.meta.get("series") or 0)


def split_front_matter(text: str) -> tuple[dict, str]:
    match = FRONT_MATTER.match(text)
    if not match:
        return {}, text
    return yaml.safe_load(match.group(1)) or {}, text[match.end() :]


def find_articles() -> list[Article]:
    articles = []
    for module in MODULES:
        base = ROOT / module / "src" / "main" / "java"
        for readme in sorted(base.rglob("README.md")):
            meta, body = split_front_matter(readme.read_text(encoding="utf-8"))
            if meta.get("status") != "published":
                continue
            missing = [key for key in ("title", "summary", "date", "series") if not meta.get(key)]
            if missing:
                sys.exit(f"{readme.relative_to(ROOT)}: published but missing {', '.join(missing)}")
            articles.append(Article(readme, module, readme.parent.name, meta, body))
    slugs = [a.doc_path for a in articles]
    duplicates = {s for s in slugs if slugs.count(s) > 1}
    if duplicates:
        sys.exit(f"two articles map to the same page: {', '.join(sorted(duplicates))}")
    numbers = [a.series for a in articles]
    repeated = {n for n in numbers if numbers.count(n) > 1}
    if repeated:
        sys.exit(f"series numbers used more than once: {sorted(repeated)}")
    return articles


class Linker:
    """Rewrites links in a Markdown file that is moving into the docs tree."""

    def __init__(self, articles: list[Article]):
        # repo-relative source path -> docs-relative page path
        self.pages = {a.source.relative_to(ROOT).as_posix(): a.doc_path for a in articles}
        self.pages["topics/README.md"] = "catalogue/index.md"
        for path in (ROOT / "topics").glob("*.md"):
            if path.name != "README.md":
                self.pages[f"topics/{path.name}"] = f"catalogue/{path.name}"

    def rewrite(self, text: str, source: Path, doc_path: str) -> str:
        out, in_fence = [], False
        for line in text.split("\n"):
            if FENCE.match(line.lstrip()):
                in_fence = not in_fence
            if not in_fence:
                line = LINK.sub(lambda m: self._link(m, source, doc_path), line)
            out.append(line)
        return "\n".join(out)

    def _link(self, match: re.Match, source: Path, doc_path: str) -> str:
        label, target = match.group(1), match.group(2)
        if re.match(r"^([a-z][a-z0-9+.-]*:|#|//)", target, re.IGNORECASE):
            return match.group(0)
        path, _, anchor = target.partition("#")
        resolved = (source.parent / path).resolve()
        try:
            repo_path = resolved.relative_to(ROOT).as_posix()
        except ValueError:
            sys.exit(f"{source.relative_to(ROOT)}: link leaves the repository: {target}")
        if not resolved.exists():
            sys.exit(f"{source.relative_to(ROOT)}: broken link: {target}")
        suffix = f"#{anchor}" if anchor else ""
        if resolved.is_dir() and (resolved / "README.md").as_posix().removeprefix(
            ROOT.as_posix() + "/"
        ) in self.pages:
            repo_path = f"{repo_path}/README.md"
        if repo_path in self.pages:
            relative = os.path.relpath(self.pages[repo_path], os.path.dirname(doc_path) or ".")
            return f"{label}({Path(relative).as_posix()}{suffix})"
        kind = "tree" if resolved.is_dir() else "blob"
        return f"{label}({GITHUB}/{kind}/{BRANCH}/{repo_path}{suffix})"


def front_matter(**fields) -> str:
    clean = {key: value for key, value in fields.items() if value not in (None, "", [])}
    return "---\n" + yaml.safe_dump(clean, sort_keys=False, allow_unicode=True) + "---\n\n"


def write(doc_path: str, text: str) -> None:
    target = DOCS / doc_path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(text, encoding="utf-8")


def write_articles(articles: list[Article], linker: Linker) -> None:
    for article in articles:
        folder = article.source.parent.relative_to(ROOT).as_posix()
        body = linker.rewrite(article.body, article.source, article.doc_path)
        footer = (
            "\n---\n\n"
            f"*Article {article.series} in [the series](../series.md), published {article.meta['date']}. "
            f"The code and tests live beside this article in "
            f"[`{folder}`]({GITHUB}/tree/{BRANCH}/{folder}). "
            f"Found a mistake or have a question? [Open an issue]({GITHUB}/issues).*\n"
        )
        header = front_matter(
            title=article.title,
            description=article.summary,
            tags=article.meta.get("tags") or [],
        )
        write(article.doc_path, header + body.rstrip("\n") + "\n" + footer)


def write_domain_indexes(articles: list[Article]) -> None:
    for module, (title, description, catalogue) in MODULES.items():
        mine = sorted((a for a in articles if a.module == module), key=lambda a: a.title.lower())
        lines = [front_matter(title=title, description=description), f"# {title}\n", f"{description}\n"]
        if mine:
            lines.append("## Articles\n")
            lines += [f"- **[{a.title}]({a.slug}.md)**: {a.summary}" for a in mine]
            lines.append("")
        else:
            lines.append("No articles published here yet.\n")
        if catalogue:
            lines.append(f"See [what is planned for this domain](../catalogue/{catalogue}).\n")
        write(f"{module}/index.md", "\n".join(lines))


def write_series(articles: list[Article]) -> None:
    lines = [
        front_matter(title="The series", description="Every article in the order it was published."),
        "# The series\n",
        "Every article in the order it was published. Topics are written as they come up, "
        "so this is a reading order by date, not a curriculum. Each article says what it assumes.\n",
        "| # | Article | Domain | Published |",
        "|---|---|---|---|",
    ]
    for a in sorted(articles, key=lambda a: a.series):
        lines.append(
            f"| {a.series} | **[{a.title}]({a.doc_path})**<br>{a.summary} "
            f"| [{MODULES[a.module][0]}]({a.module}/index.md) | {a.meta['date']} |"
        )
    write("series.md", "\n".join(lines) + "\n")


def write_home(articles: list[Article]) -> None:
    text = (SITE / "pages" / "index.md").read_text(encoding="utf-8")
    latest = sorted(articles, key=lambda a: a.series, reverse=True)[:5]
    items = "\n".join(f"- **[{a.title}]({a.doc_path})**<br>{a.summary}" for a in latest)
    write("index.md", text.replace("<!-- LATEST -->", items or "Nothing published yet."))
    shutil.copyfile(SITE / "pages" / "about.md", DOCS / "about.md")


def write_catalogue(linker: Linker) -> list[str]:
    """Copies topics/ into the docs tree and returns the catalogue nav entries."""
    rows, nav, done_total, all_total = [], [], 0, 0
    index_source = ROOT / "topics" / "README.md"
    for path in sorted((ROOT / "topics").glob("*.md")):
        if path.name == "README.md":
            continue
        text = path.read_text(encoding="utf-8")
        title = text.split("\n", 1)[0].removeprefix("# ").strip()
        boxes = CHECKBOX.findall(text)
        done, total = boxes.count("x"), len(boxes)
        done_total, all_total = done_total + done, all_total + total
        rows.append(f"| [{title}]({path.name}) | {done} | {total} |")
        nav.append(f"catalogue/{path.name}")
        doc_path = f"catalogue/{path.name}"
        write(doc_path, front_matter(title=title) + linker.rewrite(text, path, doc_path))
    intro = [
        front_matter(title="Catalogue", description="Every planned topic and how far along it is."),
        "# Topic catalogue\n",
        f"**{done_total} of {all_total} topics published.** There is no required order: "
        "topics are written as they come up in coding challenges and day-to-day work.\n",
        "| Domain | Published | Planned |",
        "|---|---|---|",
        *rows,
        "",
        "A ticked entry links to its article. **needs** lists what helps to know first, "
        "and **wild** names real implementations worth reading alongside the topic.\n",
        f"The catalogue is edited in the [repository]({GITHUB}/tree/{BRANCH}/topics). "
        "If something is missing, open an issue or a pull request.\n",
    ]
    assert index_source.exists()
    write("catalogue/index.md", "\n".join(intro))
    return nav


def write_config(articles: list[Article], catalogue_nav: list[str]) -> None:
    nav: list = [{"Home": "index.md"}, {"Series": "series.md"}]
    domains = []
    for module, (title, _, _) in MODULES.items():
        pages = [f"{module}/index.md"]
        pages += [a.doc_path for a in sorted(articles, key=lambda a: a.title.lower()) if a.module == module]
        domains.append({title: pages})
    nav.append({"Domains": domains})
    nav.append({"Catalogue": ["catalogue/index.md", *catalogue_nav]})
    nav.append({"About": "about.md"})
    config = {"INHERIT": "../mkdocs.yml", "docs_dir": "docs", "site_dir": "build", "nav": nav}
    (OUT / "mkdocs.yml").write_text(
        "# Generated by site/collect.py. Do not edit.\n" + yaml.safe_dump(config, sort_keys=False),
        encoding="utf-8",
    )


def main() -> None:
    if DOCS.exists():
        shutil.rmtree(DOCS)
    DOCS.mkdir(parents=True)
    articles = find_articles()
    linker = Linker(articles)
    write_articles(articles, linker)
    write_domain_indexes(articles)
    write_series(articles)
    write_home(articles)
    catalogue_nav = write_catalogue(linker)
    write_config(articles, catalogue_nav)
    print(f"collected {len(articles)} published article(s) into {OUT.relative_to(ROOT)}")
    for a in sorted(articles, key=lambda a: a.series):
        print(f"  {a.series:>3}  {a.doc_path}")


if __name__ == "__main__":
    main()
