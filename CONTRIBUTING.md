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

## Adding an animation

An animation in an article replays a trace: the steps the real Java code took, recorded by a test. Nothing in an animation is drawn by hand, so the trace and its still image are generated files and never edited.

1. **Record a scenario.** In the topic's test sources, write a class that runs the real implementation and records each step with a `TraceRecorder` from the [`trace`](trace/) module (`learn.trace`). The implementation reports what it is doing through a small probe interface that does nothing unless a test is listening. The hash map is the reference: [`HashMapProbe`](data-structures/src/main/java/learn/ds/hashmap/HashMapProbe.java) is the probe, [`HashMapTraceProbe`](data-structures/src/test/java/learn/ds/hashmap/HashMapTraceProbe.java) turns its events into steps, and [`HashMapScenarios`](data-structures/src/test/java/learn/ds/hashmap/HashMapScenarios.java) holds the scenarios and a freshness test for each one. A module that records traces needs `testImplementation(project(":trace"))` in its `build.gradle.kts`.
2. **Write the trace.** `./gradlew test -Ptraces.update` runs the scenarios and writes `<name>.trace.json` into the topic's `animations/` folder, beside the article.
3. **Render the still.** From `site/`, run `pnpm stills`. It writes `<name>.svg` beside every trace. GitHub shows the still in place of the animation, and so does the site when JavaScript is off.
4. **Add the image line** to the article, with alt text that says what the animation shows:

   ```markdown
   ![Five puts into an eight-bucket table: four new keys and one replacement](animations/put.svg)
   ```

   The site swaps the image for a player that steps through the trace.
5. **Commit** the `.trace.json` and the `.svg` together, then preview the site (below).

Re-run steps 2 and 3 whenever the implementation, the scenario or the article's snippet of the code changes. The checks catch a trace or still that has fallen behind: a trace that no longer matches what the code records fails `./gradlew build`, a still that no longer matches its trace fails the site's unit tests (`pnpm test`), and an image under `animations/` with no trace beside it fails `pnpm collect`, so the site cannot be built.

## Preview the site locally

The site is a Next.js static export in [`site/`](site/). You need Node 22.13 or later and pnpm 10. It does not need a JDK: the traces and stills it uses are committed.

```bash
cd site
pnpm install
pnpm collect       # copy the published articles, traces and stills into the site
pnpm build         # static export into site/out
pnpm serve         # http://localhost:4173/dsa-and-system-design-patterns/
```

Run `pnpm collect` and `pnpm build` again after changing an article.

## Testing the site

Every change to the site's code passes the same gates the site workflow runs on a pull request. Run them all, in order, with:

```bash
cd site
pnpm exec playwright install chromium   # once
pnpm verify
```

`pnpm verify` runs these and stops at the first that fails:

| Step | Command | Passes when |
|---|---|---|
| Collect | `pnpm collect` | the published articles, traces and stills copy into the site |
| Types | `pnpm typecheck` | TypeScript finds no errors |
| Unit tests | `pnpm test:coverage` | every test passes and coverage is 100% for statements, branches, functions and lines |
| Build | `pnpm build` | the static export is written to `out/` |
| Smoke tests | `pnpm exec playwright test` | every built page passes its checks |
| Mutation | `pnpm mutation:full` | every mutant is killed |

While working, `pnpm test` runs the unit tests alone in a few seconds.

**Coverage.** Every source file the coverage globs in `vitest.config.ts` name is measured, whether or not a test imports it, and `test-gates.test.ts` fails on any source file those globs or Stryker's `mutate` globs miss without a reason in its lists, so a new file needs tests before it passes. Write them first. If logic is hard to reach inside framework wiring (a Next.js route, a script's entry point), move it into a plain function, test that, and keep the wiring thin. The HTML report is in `reports/coverage/index.html`.

**Mutation testing.** [StrykerJS](https://stryker-mutator.io/) makes one small change to the code at a time, such as flipping `<` to `<=`, emptying a string or removing a call, and runs the tests that cover it. If they still pass, the mutant has survived: the tests do not check that behaviour. `pnpm mutation` is incremental: it only retests what changed since the last run, which is quick while iterating but can reuse a stale result (for instance when a helper the mutated code calls has changed), so it can be wrong in either direction. `pnpm verify` runs `pnpm mutation:full`, which reruns every mutant, and so does CI; those are the runs that count. Mutants are left out on purpose in three ways, each with its reason: Tailwind class strings (`site/stryker.ignorers.mjs`), since a test that pins a class list checks the styling, not the behaviour; a `// Stryker disable next-line <mutator>: <reason>` comment on a line whose mutant is equivalent; and the files `site/test-gates.test.ts` lists as outside `mutate`: `remotion/index.ts`, Remotion's bundle entry, which only `pnpm video` runs, and `stryker.ignorers.mjs`, Stryker's own plugin, whose rule has unit tests of its own. The report is in `reports/mutation/index.html`. For each survivor it shows the file, the line and the change, for example:

```text
[Survived] Regex
lib/render/stills.tsx:151:28
-     return traceFile.replace(/\.trace\.json$/, ".svg");
+     return traceFile.replace(/\.trace\.json/, ".svg");
```

That one came up when the site's mutation testing was first switched on, in `stillPathOf` (the line number moves as the file changes). Read it as a question: what input would behave differently with this change? Here it is a path with `.trace.json` somewhere before its end, such as a folder named `a.trace.json`. A test that `stillPathOf("/r/a.trace.json/put.trace.json")` is `"/r/a.trace.json/put.svg"` passes on the real code and fails on the mutant, so the mutant is killed. Very rarely a mutant changes nothing anyone could observe (an equivalent mutant). Then mark that line with `// Stryker disable next-line <mutator>: <why no test can tell the difference>` and mention it in the pull request.

**Smoke tests.** `e2e/pages.spec.ts` opens every page in `out/` and checks that it returns 200 with a title and a single visible heading, logs no errors, fails no requests, links only to pages and headings that exist, loads every image with alt text, shows the navigation, that each animation's still is built and has a player beside it, and that each player draws and steps forward. A separate test checks that an address with no page answers 404 with the not-found page. A new page is covered as soon as it is built. A new interactive feature also needs a test of its own in `e2e/smoke.spec.ts`.
