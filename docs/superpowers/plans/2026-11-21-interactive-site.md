# Interactive Next.js Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the MkDocs site with a Next.js static site whose articles embed step-by-step animations replayed from traces recorded by the real Java code, and render the same animations to video for LinkedIn.

**Architecture:** Java scenarios in each topic's tests drive the real implementation through a package-private probe and write a JSON trace of full state snapshots; a freshness test keeps committed traces honest. A collect script copies published articles and their traces into a Next.js 16 + Fumadocs app, where a Markdown image under `animations/` becomes an interactive React player. Layout is a pure function shared by the player (animated with Motion), the still-image generator and a Remotion composition.

**Tech Stack:** Java 25 / Gradle (existing); Next.js 16.4, React 19.3, TypeScript 7, Tailwind 4.3, Fumadocs 16 (`fumadocs-ui`, `fumadocs-core`, `fumadocs-mdx`), Motion 14, Remotion 4, Vitest, Playwright 1.65, pnpm 10, Node 22.

**Spec:** `docs/superpowers/specs/2026-11-19-interactive-site-design.md`

## Global Constraints

- Static export only (`output: 'export'`), hosted on GitHub Pages at `https://wrightm.github.io/dsa-and-system-design-patterns/`. `basePath: '/dsa-and-system-design-patterns'`, `trailingSlash: true`.
- These URLs must keep working: `/`, `/series/`, `/about/`, `/catalogue/`, `/catalogue/<domain>/`, `/<module>/`, `/data-structures/hashmap/`.
- Articles stay as plain `README.md` beside the code, standard Markdown only, readable on github.com. No MDX syntax in articles.
- An animation only ever shows state recorded from the real implementation. No hand-authored snapshots.
- The site build must not need a JDK. Traces and stills are committed.
- Article text must stand alone without JavaScript: the still image is the fallback.
- Java build rules are unchanged: warnings are errors, Spotless google-java-format, no new runtime dependencies in topic modules.
- Work happens on branch `interactive-site`. Merging to `main` deploys the site, so the merge and push in Task 9 wait for Michael's go-ahead.
- Commit messages end with `Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>`.
- Pin exact dependency versions in `site/package.json`; commit `pnpm-lock.yaml`.

## Review Focus

1. **A trace with zero or one step.** The player renders the single state (or an empty frame), with play and step controls disabled, and does not throw. (Task 5)
2. **Stepping or scrubbing out of range.** `prev` at the first step, `next` at the last, and `seek` to a negative or too-large index all clamp; play stops itself at the last step. (Task 5)
3. **A malformed or unknown trace.** Wrong `version`, unknown `kind`, or an image under `animations/` with no matching trace fails the build with a message naming the file, never a blank box on the live site. (Tasks 3 and 6)
4. **Text that needs escaping.** Keys and captions containing `"`, `\`, `<`, `&`, newlines and non-ASCII characters survive the Java JSON writer, the player and the SVG still unchanged. (Tasks 1 and 7)
5. **Reduced motion.** With `prefers-reduced-motion: reduce`, steps cut without tweening and autoplay still advances. (Task 6)

## File Structure

```
trace/                                   new Gradle module, package learn.trace
  src/main/java/learn/trace/{Trace,Step,Source,TraceRecorder,TraceJson,TraceFiles}.java
data-structures/src/main/java/learn/ds/hashmap/
  HashMapProbe.java                      package-private event hook
  ChainedHashMap.java                    modified: probe calls, snapshot view
  animations/{put,resize,high-bits}.trace.json   committed traces
  animations/{put,resize,high-bits}.svg          committed stills
data-structures/src/test/java/learn/ds/hashmap/
  HashMapTraceProbe.java                 turns probe events into trace steps
  HashMapScenarios.java                  the three scenarios + freshness tests
site/                                    Next.js app (replaces MkDocs files)
  scripts/collect.ts                     articles, traces, catalogue -> content/
  scripts/render-stills.tsx              trace -> committed SVG
  lib/content/{articles,links,catalogue}.ts
  lib/trace/{types,validate}.ts
  lib/player/reducer.ts
  lib/render/hash-table/{layout,HashTableSvg}.tsx
  components/{Player,Animation,SourceExcerpt,Mermaid}.tsx
  lib/remark-animations.ts
  app/...                                routes
  remotion/{index.ts,TraceVideo.tsx}
  e2e/smoke.spec.ts
```

---

### Task 1: `trace` module

**Files:**
- Create: `trace/build.gradle.kts`, `trace/src/main/java/learn/trace/{Trace,Step,Source,TraceRecorder,TraceJson,TraceFiles,package-info}.java`
- Modify: `settings.gradle.kts` (add `"trace"`), `buildSrc/.../learn.java-conventions.gradle.kts` (pass project property `traces.update` to tests as system property `learn.traces.update`)
- Test: `trace/src/test/java/learn/trace/{TraceJsonTest,TraceRecorderTest,TraceFilesTest}.java`

**Interfaces:**
- Produces:
  - `record Source(String file, int line)`
  - `record Step(String caption, Source source, Map<String, Object> state)` (`source` may be null)
  - `record Trace(int version, String id, String title, String kind, String layout, List<Step> steps)`; `Trace.VERSION = 1`
  - `TraceRecorder(String id, String title, String kind, String layout)`; `void step(String caption, Source source, Map<String, Object> state)`; `Trace build()`. `step` deep-copies `state`.
  - `static String TraceJson.write(Trace trace)`: pretty-printed, two-space indent, keys in insertion order, `\n` line endings, trailing newline. Supports `String`, `Number`, `Boolean`, `null`, `Map<String, ?>`, `List<?>`; anything else throws `IllegalArgumentException` naming the type.
  - `static void TraceFiles.assertFresh(Trace trace, Path file)`: if system property `learn.traces.update` is `true`, writes the file (creating directories); otherwise throws `AssertionError` with message `stale trace: <file>. Run ./gradlew test -Ptraces.update` when the file is missing or differs.

- [ ] **Step 1: Write failing tests**
  - `TraceJsonTest.writesStepsInOrderWithStableKeyOrder`: a two-step trace serialises to an exact expected string held in the test.
  - `TraceJsonTest.escapesSpecialCharacters`: caption `He said "hi" \ <b>&</b>\nnext ü 漢` appears as `"He said \"hi\" \\ <b>&</b>\nnext ü 漢"` (only `"`, `\` and control characters are escaped).
  - `TraceJsonTest.rejectsUnsupportedValueTypes`: a state holding `new Object()` throws `IllegalArgumentException`.
  - `TraceRecorderTest.laterMutationOfStateDoesNotChangeRecordedStep`.
  - `TraceFilesTest.failsWhenFileIsMissingOrDiffers` and `writesWhenUpdateFlagIsSet` (use `@TempDir`; set and restore the system property).
- [ ] **Step 2:** Run `./gradlew :trace:test`. Expected: compilation failure, classes not defined.
- [ ] **Step 3:** Implement the module. No third-party dependencies: `TraceJson` is a small hand-written writer.
- [ ] **Step 4:** Run `./gradlew spotlessApply :trace:build`. Expected: BUILD SUCCESSFUL.
- [ ] **Step 5:** Commit: `Add trace module for recording step-by-step animations`.

### Task 2: Hash map probe, scenarios and committed traces

**Files:**
- Create: `data-structures/src/main/java/learn/ds/hashmap/HashMapProbe.java`, `data-structures/src/test/java/learn/ds/hashmap/{HashMapTraceProbe,HashMapScenarios}.java`, `data-structures/src/main/java/learn/ds/hashmap/animations/{put,resize,high-bits}.trace.json`
- Modify: `ChainedHashMap.java`, `data-structures/build.gradle.kts` (`testImplementation(project(":trace"))`)

**Interfaces:**
- Consumes: Task 1 types.
- Produces (all package-private in `learn.ds.hashmap`):
  - `interface HashMapProbe` with default no-op methods: `hashed(Object key, int hashCode, int spread, int index)`, `visited(int bucket, int position, boolean matched)`, `linked(Object key, int bucket)`, `replaced(Object key, int bucket)`, `resizing(int oldCapacity, int newCapacity)`, `moved(Object key, int fromBucket, int toBucket)`, `resized(int capacity)`; constant `HashMapProbe.NONE`.
  - `ChainedHashMap.probe(HashMapProbe probe)` setter; `ChainedHashMap.buckets()` returning `List<List<NodeView>>`; `record NodeView(Object key, Object value, int hash)`.
  - Trace `kind` is `"hash-table"`. Step state shape:
    ```json
    { "capacity": 8, "size": 2, "threshold": 6,
      "buckets": [[{"id": "k:alice", "key": "alice", "value": "31", "hash": "0x0058a1f2"}], []],
      "focus": {"bucket": 2, "node": "k:alice"},
      "pipeline": {"key": "carol", "hashCode": "0x05a0e3c1", "spread": "0x05a0e661", "index": 1} }
    ```
    `focus` and `pipeline` are `null` when not applicable; `focus.node` may be `null`. Node `id` is `"k:" + key`. Hashes are 8-digit lower-case hex strings.
  - Trace ids and layouts: `put` (`"chains"`, capacity 8, keys alice, bob, carol, dave, then alice again to show replacement), `resize` (`"chains"`, default capacity 16, 13 integer-string keys so the 13th doubles the table to 32), `high-bits` (`"grid"`, capacity 1024, floats 1.0f to 255.0f).
  - `Source.file` is `"ChainedHashMap.java"`; `Source.line` is the line in `ChainedHashMap` that called the probe, found by `HashMapTraceProbe` with `StackWalker`.

- [ ] **Step 1: Write failing tests** in `HashMapScenarios`:
  - `putTraceIsFresh`, `resizeTraceIsFresh`, `highBitsTraceIsFresh`: each builds its trace and calls `TraceFiles.assertFresh(trace, Path.of("src/main/java/learn/ds/hashmap/animations/<id>.trace.json"))`.
  - `resizeTraceShowsTheTableDoublingOnTheThirteenthPut`: some step has `capacity` 16 and a later one 32; final `size` is 13.
  - `everySourceLinePointsInsideChainedHashMap`: each non-null `source.line` is between 1 and the file's line count.
  - `aProbeDoesNotChangeBehaviour`: the same operations with and without a probe give equal `buckets()`.
- [ ] **Step 2:** Run `./gradlew :data-structures:test`. Expected: compilation failure.
- [ ] **Step 3:** Add `HashMapProbe`, the probe calls and `buckets()` to `ChainedHashMap`. Existing tests must pass untouched.
- [ ] **Step 4:** Implement `HashMapTraceProbe` (each event becomes one step: a plain-English caption, the caller's source line, and a snapshot built from `buckets()`).
- [ ] **Step 5:** Implement the scenarios. The high-bits scenario has two phases in one trace. Phase one shows where each key would land using `indexFor(key.hashCode(), 1024)` (state computed with the real static method, every key in bucket 0). Phase two inserts the same keys into a real `ChainedHashMap` of capacity 1024. To keep it short, record a step for every 16th key, not every probe event. Captions state the count of occupied buckets (1, then 255).
- [ ] **Step 6:** Run `./gradlew :data-structures:test -Ptraces.update`, then `./gradlew spotlessApply build` with no flag. Expected: BUILD SUCCESSFUL, three trace files exist.
- [ ] **Step 7:** Check the article's line references still hold (the hash map `README.md` quotes no line numbers of `ChainedHashMap`; confirm with a search) and commit: `Record hash map animation traces from the real implementation`.

### Task 3: Content collection in TypeScript

**Files:**
- Create: `site/package.json`, `site/tsconfig.json`, `site/vitest.config.ts`, `site/lib/content/{articles,links,catalogue}.ts`, `site/lib/trace/{types,validate}.ts`, `site/scripts/collect.ts`
- Test: `site/lib/content/*.test.ts`, `site/lib/trace/validate.test.ts` with fixtures under `site/test/fixtures/repo/`
- Modify: `.gitignore` (replace the MkDocs entries with `site/node_modules/`, `site/.next/`, `site/out/`, `site/.source/`, `site/content/`, `site/public/generated/`)

**Interfaces:**
- Produces:
  - `type Article = { module: string; slug: string; title: string; summary: string; date: string; series: number; tags: string[]; sourcePath: string; body: string }`
  - `findArticles(repoRoot: string): Article[]`: published only; throws naming the file if `title`, `summary`, `date` or `series` is missing, or two articles share a series number or page.
  - `rewriteLinks(markdown: string, sourceFile: string, pagePath: string, pages: Map<string, string>, repoRoot: string): string`: same rules as `site/collect.py` (published article or catalogue file becomes a site-relative link, anything else a `github.com/.../blob|tree/main/...` link, fenced code untouched, broken link throws). Image links under `animations/` are left unchanged for Task 6.
  - `catalogueProgress(repoRoot: string): { file: string; title: string; done: number; total: number }[]`
  - `MODULES`: the module table from `collect.py` (title, description, catalogue file).
  - `type Trace`, `type Step`, `type HashTableState` mirroring Task 2's JSON; `validateTrace(json: unknown, file: string): Trace` throws `Error("<file>: ...")` on wrong `version`, unknown `kind`/`layout`, or a missing field.
  - `pnpm collect` writes: `content/docs/<module>/<slug>.md`, `content/docs/<module>/index.md`, `content/docs/{index,series,about}.md`, `content/docs/catalogue/*.md`, `content/traces/<module>/<slug>/<name>.json`, `content/sources/<module>/<slug>/<File>.java` for every file a trace's `source.file` names, and copies stills to `public/generated/animations/<module>/<slug>/<name>.svg`.

- [ ] **Step 1: Write failing tests** against a fixture repo holding one published article, one draft, one catalogue file and one trace:
  - `findArticles` returns only the published one; a published fixture without `summary` throws with its path.
  - `rewriteLinks` cases: sibling `.java` file, test file up the tree, catalogue file, another published article, an `https:` link (unchanged), a link inside a code fence (unchanged), a missing target (throws).
  - `catalogueProgress` counts `- [x]` and `- [ ]` lines.
  - `validateTrace` accepts the fixture and rejects `version: 2`, `kind: "heap"` and a step with no `state`, each error starting with the file name.
- [ ] **Step 2:** `pnpm install && pnpm vitest run`. Expected: FAIL, modules not found.
- [ ] **Step 3:** Implement the libraries and `scripts/collect.ts` (run with `tsx`). Home and about text move from `site/pages/*.md` to `site/content-src/{index,about}.md`, keeping the `<!-- LATEST -->` marker behaviour.
- [ ] **Step 4:** `pnpm vitest run` passes; `pnpm collect` prints `collected 1 published article(s)` and the files above exist.
- [ ] **Step 5:** Commit: `Port content collection to TypeScript`.

### Task 4: Next.js app shell

**Files:**
- Create: `site/next.config.mjs`, `site/source.config.ts`, `site/app/{layout.tsx,global.css}`, `site/app/[[...slug]]/page.tsx`, `site/lib/source.ts`, `site/components/Mermaid.tsx`, `site/app/api/search/route.ts`, `site/app/og/[...slug]/route.tsx`, `site/e2e/smoke.spec.ts`, `site/playwright.config.ts`

**Interfaces:**
- Consumes: `content/docs/**` from Task 3.
- Produces: `pnpm build` writes the static site to `site/out/`; `pnpm serve` serves it under the base path on port 4173 for the smoke test; MDX component map exported from `site/mdx-components.tsx` (Task 6 adds `Animation` to it).

- [ ] **Step 1: Write the failing smoke test** (`e2e/smoke.spec.ts`): each URL in Global Constraints returns 200; `/data-structures/hashmap/` has an `h1` containing `Hash map`, an `og:image` meta tag, a rendered Mermaid `svg`, and a link to `ChainedHashMap.java` on github.com; typing `hash map` in search shows the article.
- [ ] **Step 2:** Run `pnpm exec playwright test`. Expected: FAIL, nothing to serve.
- [ ] **Step 3:** Build the app. Fumadocs docs layout mounted at the root through the optional catch-all route; page tree order Home, Series, Domains (modules in `MODULES` order), Catalogue, About. Fumadocs MDX collection over `content/docs` with files kept as `.md` and parsed as Markdown, not MDX (articles contain `<` and `{` in prose and tables). **Check this first:** if `fumadocs-mdx` cannot parse `.md` as plain Markdown, stop and report rather than converting articles to MDX. Static search (Orama, static mode). Mermaid through a client component fed by Fumadocs' Mermaid remark plugin. Light and dark themes, indigo accent as on the current site.
- [ ] **Step 4:** Per-article link-preview image, 1200×630, title and summary, statically generated.
- [ ] **Step 5:** `pnpm collect && pnpm build && pnpm exec playwright test`. Expected: all pass.
- [ ] **Step 6:** Commit: `Add Next.js site shell with Fumadocs`.

### Task 5: Player state and controls

**Files:**
- Create: `site/lib/player/reducer.ts`, `site/components/Player.tsx`
- Test: `site/lib/player/reducer.test.ts`, `site/components/Player.test.tsx` (Vitest with Testing Library, jsdom)

**Interfaces:**
- Produces:
  - `type PlayerState = { index: number; playing: boolean; speed: 0.5 | 1 | 2 }`
  - `type PlayerAction = { type: 'next' | 'prev' | 'play' | 'pause' | 'tick' | 'first' | 'last' } | { type: 'seek'; index: number } | { type: 'speed'; speed: 0.5 | 1 | 2 }`
  - `playerReducer(state: PlayerState, action: PlayerAction, stepCount: number): PlayerState`
  - `<Player trace={Trace} renderStep={(step: Step, previous: Step | null, reducedMotion: boolean) => ReactNode} footer?={(step: Step) => ReactNode} />`: a `figure` with the rendered step, the caption in an `aria-live="polite"` region, a `step N of M` label, buttons First, Back, Play/Pause, Forward, Last, a range input for scrubbing and a speed select. Keys when focused: Left/Right step, Space toggles play, Home/End jump. Base step duration 1800 ms divided by speed.

- [ ] **Step 1: Write failing reducer tests:** `next` at the last index and `prev` at 0 leave `index` unchanged; `seek` to `-3` gives 0 and to `999` gives `stepCount - 1`; `tick` advances while playing and sets `playing: false` on reaching the last step; `play` at the last step restarts from 0; with `stepCount` 0 or 1 every action returns `index: 0, playing: false`.
- [ ] **Step 2: Write failing component tests:** with a three-step trace, clicking Forward changes the caption to step two's and the label to `step 2 of 3`; Right arrow does the same; with a one-step trace and with a zero-step trace the component renders without throwing and Play, Back and Forward are disabled.
- [ ] **Step 3:** `pnpm vitest run`. Expected: FAIL.
- [ ] **Step 4:** Implement the reducer and component (`'use client'`, timer driven by `tick`, cleared on unmount and when the tab is hidden).
- [ ] **Step 5:** `pnpm vitest run` passes. Commit: `Add animation player controls`.

### Task 6: Hash table renderer and article embedding

**Files:**
- Create: `site/lib/render/hash-table/{layout.ts,HashTableSvg.tsx,palette.ts}`, `site/components/{Animation.tsx,SourceExcerpt.tsx}`, `site/lib/remark-animations.ts`
- Modify: `site/source.config.ts` (register the remark plugin), `site/mdx-components.tsx`, `site/e2e/smoke.spec.ts`
- Test: `site/lib/render/hash-table/layout.test.ts`, `site/lib/remark-animations.test.ts`

**Interfaces:**
- Consumes: `Trace`, `HashTableState`, `<Player>`.
- Produces:
  - `layoutHashTable(state: HashTableState, layout: 'chains' | 'grid'): Scene` where `Scene = { width: number; height: number; items: SceneItem[] }` and `SceneItem = { id: string; kind: 'bucket' | 'node' | 'link' | 'pipeline' | 'label'; x: number; y: number; w: number; h: number; text?: string; emphasis?: 'focus' | 'new' | 'none'; count?: number }`. Pure and deterministic; ids are stable across steps (`b:<index>`, the node's `id`, `l:<fromId>`). Text longer than 12 characters is truncated with an ellipsis.
  - `<HashTableSvg scene={Scene} palette={Palette} positions?={Record<string, {x: number; y: number; opacity: number}>} animate={boolean} />`: when `positions` is given it draws there and uses no Motion (for Remotion and stills); otherwise Motion animates items between scenes by id when `animate` is true.
  - `LIGHT: Palette` (fixed hex colours for stills and video) and `THEMED: Palette` (CSS variables for the site).
  - `remarkAnimations({ pagePathOf })`: turns an image whose URL matches `animations/<name>.svg` into an `Animation` element with `id="<module>/<slug>/<name>"` and the image's alt text; throws `Error("<article>: no trace for animations/<name>.svg")` if `content/traces/<id>.json` is missing.
  - `<Animation id alt />`: server component that loads and validates the trace, loads the Java source it names, and renders `<Player>` with `HashTableSvg` plus a `<SourceExcerpt>` footer showing the step's line with three lines either side, the current line highlighted. Inside `<noscript>` it renders the still `img` with the alt text.

- [ ] **Step 1: Write failing tests:**
  - `layout.test.ts`: for the first and last states of the committed `put` trace, every node id appears once and node boxes do not overlap; a node that stays in the same bucket keeps its id between steps; a `grid` scene for capacity 1024 has 1024 bucket items and no node items, with `count` on each bucket; a key of 30 characters renders at most 12 characters plus `…`.
  - `remark-animations.test.ts`: an `animations/put.svg` image becomes an `Animation` node; an ordinary image is untouched; a missing trace throws with the article path.
  - Add to `smoke.spec.ts`: on the hash map page the first player's Forward button changes its caption; with `reducedMotion: 'reduce'` emulated, clicking Forward leaves no element with a running animation (`document.getAnimations().length === 0`) and Play still advances the step label.
- [ ] **Step 2:** Run both test commands. Expected: FAIL.
- [ ] **Step 3:** Implement layout, renderer, remark plugin and components. `chains` draws buckets as a column with chains running right and the key pipeline (key, hashCode, spread, index) above; `grid` draws a 32-column grid coloured by chain length.
- [ ] **Step 4:** `pnpm vitest run` passes (the article gains its images in Task 7, so the smoke additions stay failing until then; mark them `test.fixme` with a comment naming Task 7).
- [ ] **Step 5:** Commit: `Render hash table traces as interactive animations`.

### Task 7: Stills and the hash map article

**Files:**
- Create: `site/scripts/render-stills.tsx`, `site/lib/render/stills.test.ts`, `data-structures/src/main/java/learn/ds/hashmap/animations/{put,resize,high-bits}.svg`
- Modify: the hash map `README.md`, `scripts/check-links.py` (no change expected; confirm it accepts the image links), `site/e2e/smoke.spec.ts` (remove the `fixme` marks)

**Interfaces:**
- Consumes: `layoutHashTable`, `HashTableSvg`, `LIGHT`.
- Produces: `renderStill(trace: Trace): string` (a complete standalone SVG document of the final step, white background, caption underneath, a small "Interactive version on the site" note); `pnpm stills` writes `<name>.svg` beside every `<name>.trace.json` in the repo.

- [ ] **Step 1: Write failing tests:** `renderStill` output for the committed `put` trace starts with `<svg` and contains `xmlns="http://www.w3.org/2000/svg"`; a trace whose key is `a<b&"c"` produces well-formed XML (parse it) containing `a&lt;b&amp;`; for every `*.trace.json` in the repo the committed `.svg` equals `renderStill` of it, with failure message `stale still: <file>. Run pnpm stills`.
- [ ] **Step 2:** `pnpm vitest run`. Expected: FAIL.
- [ ] **Step 3:** Implement with `renderToStaticMarkup`; run `pnpm stills`.
- [ ] **Step 4:** Edit the article. Add three image lines, each followed by one sentence saying what to watch for: `![Inserting five entries into an eight-bucket table](animations/put.svg)` at the end of Step 2, `![The thirteenth entry doubles the table](animations/resize.svg)` in Step 3 after the amortised paragraph, `![Whole-number floats with and without spreading](animations/high-bits.svg)` at the end of Step 4. Keep the Mermaid diagram.
- [ ] **Step 5:** `pnpm vitest run`, `python3 scripts/check-links.py`, `pnpm collect && pnpm build && pnpm exec playwright test`. Expected: all pass. Open the three stills and the built page and look at them; fix any overlap or clipped text.
- [ ] **Step 6:** Commit: `Add animations to the hash map article`.

### Task 8: LinkedIn video with Remotion

**Files:**
- Create: `site/remotion/{index.ts,Root.tsx,TraceVideo.tsx,interpolate.ts}`, `site/scripts/render-video.ts`, `blog/linkedin/media/001-hash-map-put.mp4`
- Test: `site/remotion/interpolate.test.ts`
- Modify: `blog/linkedin/001-hash-map.md` (add a `media:` front matter line), `blog/linkedin/README.md`

**Interfaces:**
- Consumes: `layoutHashTable`, `HashTableSvg` with `positions`, `LIGHT`.
- Produces:
  - `positionsAt(from: Scene, to: Scene, t: number): Record<string, { x: number; y: number; opacity: number }>`: items in both scenes move linearly; items only in `to` fade in from opacity 0; items only in `from` fade out; `t` is clamped to 0..1.
  - Composition `TraceVideo`, 1080×1080, 30 fps, props `{ trace: Trace }`; duration derived from the step count. Title card, then each step with its caption in large text, then an end card with the article URL.
  - `pnpm video <module>/<slug>/<name> <output.mp4>`.

- [ ] **Step 1: Write failing tests** for `positionsAt`: at `t = 0` positions equal `from`, at `t = 1` equal `to`, at `0.5` a moved item is halfway; an added item has opacity 0 at `t = 0` and 1 at `t = 1`; `t = 1.7` equals `t = 1`.
- [ ] **Step 2:** `pnpm vitest run`. Expected: FAIL.
- [ ] **Step 3:** Implement and render: `pnpm video data-structures/hashmap/put ../blog/linkedin/media/001-hash-map-put.mp4`.
- [ ] **Step 4:** Verify with `ffprobe`: 1080×1080, 30 fps, H.264, under 60 seconds, under 10 MB. Extract three frames (start, middle, end) and look at them.
- [ ] **Step 5:** Commit: `Render LinkedIn video from the same trace`.

### Task 9: CI, docs, MkDocs removal and release

**Files:**
- Modify: `.github/workflows/site.yml`, `.github/workflows/ci.yml`, `README.md`, `CONTRIBUTING.md`, `CLAUDE.md`, `scripts/new-topic.sh`, `templates/ARTICLE.md`
- Delete: `site/mkdocs.yml`, `site/collect.py`, `site/requirements.txt`, `site/pages/`

- [ ] **Step 1:** `site.yml`: Node 22 and pnpm with cache, `pnpm install --frozen-lockfile`, `pnpm collect`, `pnpm typecheck` (`tsc --noEmit`), `pnpm vitest run`, `pnpm build`, Playwright smoke (Chromium only), upload `site/out`, deploy. Runs the test steps on pull requests without deploying.
- [ ] **Step 2:** `ci.yml` is unchanged except that `./gradlew build` now includes `:trace`. Confirm the freshness tests run there.
- [ ] **Step 3:** Docs. `CONTRIBUTING.md`: replace the MkDocs preview with `pnpm` commands and add "Adding an animation" (write a scenario, `./gradlew test -Ptraces.update`, `pnpm stills`, add the image line). `CLAUDE.md`: animations come only from recorded traces; regenerate traces and stills when an implementation changes. `README.md`: mention the animations and the `trace` module. `templates/ARTICLE.md`: a commented example image line. `new-topic.sh`: create an empty `animations/` folder note in the printed next steps (no directory is created until there is a trace).
- [ ] **Step 4:** Delete the MkDocs files. Run `./gradlew build`, `python3 scripts/check-links.py`, and the full site test sequence. Expected: all pass.
- [ ] **Step 5:** Commit: `Switch the site build to Next.js and remove MkDocs`.
- [ ] **Step 6:** Push the branch and open a pull request. Confirm both workflows pass on it.
- [ ] **Step 7:** **Stop for Michael's go-ahead**, with the preview evidence (smoke results, stills, three video frames). On approval, merge to `main`.
- [ ] **Step 8:** After deploy: every URL in Global Constraints returns 200; the hash map page has its `og:image`, three players, and working code links; search finds "hash map". Report results.
