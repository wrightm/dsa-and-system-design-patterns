# Adding a topic

Corrections and questions are welcome as issues or pull requests. A good question about an article often ends up in its "Questions that came up" section.

## 1. Scaffold

```bash
scripts/new-topic.sh <module> <slug> "Title"
```

Modules and their packages are listed in the [README](README.md#how-the-repo-is-laid-out). The slug is lower-case words joined by hyphens. If the topic is not in the [catalogue](topics/README.md), add it there first.

## 2. Build it test first

- Write the naive version first and keep it in the repo. The article opens with it.
- Each step in the article names the test that proves it, so write the tests as you go.
- For a data structure, add a jqwik property test that compares it with a trusted reference (see [`SimpleMapProperties`](data-structures/src/test/java/learn/ds/hashmap/SimpleMapProperties.java)).
- A performance claim needs a JMH benchmark in `benchmarks/`. No benchmark, no numbers.

## 3. Write the article

Fill every section of the template. The standard:

- **Starts from failure.** The first section shows the simple approach and exactly where it breaks.
- **Says something the first page of search results does not.** Usually that comes from the source reading or from a question that was actually asked.
- **Source links are pinned** to a tag or commit, never to a branch, and line numbers are checked against that tag.
- **Decisions come with their cost** and the alternative that was not taken.
- **Plain language.** Short sentences, the plain word over the clever one, a term explained the first time it appears.
- **Standard Markdown only.** Mermaid for diagrams. No GitHub-only alert syntax, because the same file is built into the website.
- **Prerequisites are linked.** If a prerequisite has no article yet, link its catalogue file and give a short primer in place.

The [hash map article](data-structures/src/main/java/learn/ds/hashmap/README.md) is the reference for tone and depth.

## 4. Publish

1. `./gradlew build` passes.
2. `python3 scripts/check-links.py` passes.
3. In the article's front matter set `status: published`, the `date`, a one-sentence `summary`, and the next free `series` number.
4. Tick the entry in the catalogue and link its name to the article.
5. Add the article to the table in the root README.
6. Draft the announcement in `blog/linkedin/NNN-<slug>.md`.

Pushing to `main` rebuilds the website. Articles still marked `draft` are left out of it.

## Preview the site locally

```bash
python3 -m venv site/.venv
site/.venv/bin/pip install -r site/requirements.txt
site/.venv/bin/python site/collect.py
site/.venv/bin/mkdocs serve -f site/.generated/mkdocs.yml
```
