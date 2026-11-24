# Interactive, animated site on Next.js

Date: 2026-11-19. Status: awaiting approval.

## Intent

The site should teach each data structure and algorithm step by step, with animations the reader controls, not only text and a static diagram. LinkedIn posts should carry the same animations as media, since LinkedIn cannot run interactive content.

## Goals

- A reader can play, pause, step forwards and backwards, and scrub through an animation inside an article.
- Every animation shows what the tested Java code actually did. It cannot drift from the implementation.
- Adding an animation to a new topic is mostly a matter of writing a scenario in Java, not front-end work.
- One animation source produces the interactive player, a still image for GitHub, and a video for LinkedIn.
- Articles stay as Markdown beside the code and still read properly on github.com.
- Existing URLs keep working, in particular `/data-structures/hashmap/`.

## Non-goals (for this piece of work)

- Readers typing their own input. Scenarios are prepared. Live input can come later, per topic, by compiling the Java to JavaScript with TeaVM.
- Accounts, saved progress, quizzes, or anything needing a server. The site stays a static export on GitHub Pages.
- Animating every catalogue topic. Hash map is converted first and sets the pattern.

## Anti-goals

- An animation that was hand-drawn to look right but does not come from the real code.
- Articles that only make sense with JavaScript running. The text must stand on its own, with a still image where the player would be.
- Motion for decoration. Each animation answers a question the article raises.

## Approaches considered

| Approach | Trade-off |
|---|---|
| **Next.js static export, Fumadocs, React players replaying Java-emitted traces (chosen)** | Michael knows React. The best animation libraries are React-first, and Remotion can render the same components to video. Costs a migration off MkDocs and heavier pages. |
| MkDocs with framework-free web components | No migration and light pages, but no React ecosystem and video only by screen recording. MkDocs Material also reaches end of life in May 2027. |
| Astro with React islands | Lighter pages with the same components, but a second framework to learn and a weaker path to app features later. |

Michael chose Next.js on 2026-11-19.

For where the steps come from, three options were weighed: Java emits a trace (chosen), rewrite each algorithm in TypeScript (two implementations, and the animated one is untested), or compile Java to JavaScript in the browser (deferred, see non-goals).

## Design

### Traces

- A trace is a JSON file: a title, the kind of structure, and an ordered list of steps.
- Each step holds a caption, an optional source reference (file and line range to highlight), and a **complete snapshot** of the structure at that moment. Full snapshots make stepping backwards and scrubbing trivial. Elements carry stable ids so the renderer can animate an element moving between snapshots.
- Java side: a small `learn.trace` library (new `trace` module) with a recorder. Each topic has a scenario class in its test source set that runs the real implementation and records steps. Implementations expose what is needed through a package-private listener hook, so production code paths stay the same.
- Traces are committed under the topic folder in `animations/<name>.trace.json`. A test regenerates each one and fails if the committed file is stale, so the site build needs no JDK and a trace can never silently go out of date.

### Players

- One `<Player>` React component: play, pause, step, scrub bar, speed, keyboard control, caption, and the highlighted Java lines for the current step. It honours the reduced-motion setting by cutting between steps without tweening.
- One renderer per kind of structure, drawn in SVG and animated with Motion: `hash-table` first, then `array`, `linked-list`, `tree` and `graph` as topics need them. A renderer is reused by every topic of that kind.
- Player state is a plain reducer, tested without a browser.

### Embedding in articles

- An article embeds an animation with a normal Markdown image: `![Inserting four keys](animations/put.svg)`.
- On github.com that shows the still image. On the site, an image under `animations/` with a matching `.trace.json` is replaced by the interactive player, with the still as the no-JavaScript fallback.
- Stills are rendered from the trace by a script, not drawn by hand.

### Site

- `site/` becomes a Next.js 16 app (React 19, TypeScript, Tailwind 4, pnpm) using Fumadocs UI for navigation, search, table of contents and dark mode. Static export with `basePath` set for GitHub Pages and trailing slashes so current URLs survive.
- A content loader in TypeScript replaces `collect.py`: it finds published `README.md` files, applies the same link rewriting, and builds the series page, domain indexes and catalogue with progress. Mermaid diagrams keep working.
- Link-preview images are generated at build time per article.
- MkDocs, `collect.py` and the Python requirements are removed once the new site is live and checked.

### LinkedIn media

- A Remotion composition wraps the same renderers and drives them by frame, producing an MP4 per animation (square, captions burned in). The same composition can output stills for a PDF carousel later.
- Output goes to `blog/linkedin/media/`, referenced from the post file. Posting rules are unchanged: nothing is posted without approval of the exact text and media.

### Hash map, the first conversion

Three animations, each tied to a section of the article:

1. **Put:** key to `hashCode`, spread, mask, bucket, chain (step 1 and 2).
2. **Resize:** the 13th entry doubles a 16-bucket table and the chains split (step 3).
3. **High-bit collisions:** whole-number floats piling into bucket 0 without spreading, then fanning out with it (step 4).

### Checks

- Java: trace freshness tests in `./gradlew build`.
- Site: unit tests for the loader and player reducer (Vitest), a Playwright smoke test that the hash map page loads and the player steps, type check, and the build itself.
- CI: the `site` workflow switches from Python to Node. The `build` workflow is unchanged apart from the new module.
- After deploy: the same live checks as before (pages return 200, preview tags present, code links resolve).

## Calls made by Claude, open to correction

- Prepared scenarios first, live input later.
- Video first for LinkedIn, carousel later from the same source.
- Fumadocs over Nextra (larger current release cadence, static search built in).
- Committed traces with a freshness test, over generating them in CI.
- Stay on GitHub Pages. Moving to Vercel only becomes worthwhile when a server feature is wanted.
- Remotion is free for individuals and small teams; that licence fits this repo today.

## Left to the builder

Exact trace schema field names, renderer layout maths, visual styling within the Fumadocs theme, and the Remotion timing per step.
