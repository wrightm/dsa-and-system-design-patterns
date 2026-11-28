# Question inbox

Questions about topics that do not have a folder yet. When a topic is scaffolded with `scripts/new-topic.sh`, its questions move from here into that topic's `NOTES.md`.

<!-- Format:
## Topic name (catalogue file)
### YYYY-MM-DD: the question
What resolved it, if anything yet.
-->

## The site itself (no catalogue topic; logged by Claude here because there is no topic folder for it)

### 2026-11-27: what is the test coverage of the site and also what is the fill structure

("fill structure" read as "file structure".)

Coverage, measured on commit 09d2b4d with `vitest run --coverage` (v8 provider, installed temporarily and not committed): 73.95% statements, 71.24% branches, 73.05% functions, 74.94% lines, from 117 unit tests in 15 files. The logic is well covered (`lib/content` 95%, `lib/render/hash-table` 99%, `Player.tsx` 94%, `remark-animations.ts` 98%). The files at 0% are the Next.js wiring (`app/`, `source.config.ts`, `mdx-components.tsx`), `Animation.tsx`, `HashTablePlayer.tsx`, `Mermaid.tsx`, the search dialog and the scripts. Those run only in the real build and in the 17 Playwright smoke tests, which this number does not count.

File structure: `app/` routes, `components/` React components, `lib/` logic (content loader, trace types, player reducer, renderers), `remotion/` video, `scripts/` command-line entry points, `e2e/` Playwright, `content-src/` home and about text, `test/fixtures/` a small fake repo.

### 2026-11-27: can we make sure we have 100% unitest and mutation tests for the site and smoke tests on each page can we make sure the agents always follow that and its part of the verification

Being done on the `interactive-site` branch: coverage thresholds at 100% enforced by Vitest, mutation testing with StrykerJS, a Playwright smoke test generated from every built page, one `pnpm verify` command, the rule written into `CLAUDE.md` and `CONTRIBUTING.md`, and the `site` workflow failing when any of them drops. The outcome and any exclusions are recorded in the commit and the pull request.

## Machine learning and AI (no catalogue file yet)

### 2026-11-27: I am wanting to also focus on ML and AI algorithms what are your thoughts of having this in this repo and where?

Claude's recommendation, not yet decided by Michael: keep it in this repo as a new top-level module `machine-learning/` with its own catalogue file `topics/machine-learning.md`, beside `algorithms/` and not inside it. Write the algorithms from scratch in plain Java, as everything else here is, and treat framework-heavy topics (training real models, LLM applications) as nested subprojects or leave them out. Reasons: the method here (start from the approach that fails, implement it, test it, record a trace, animate it) suits gradient descent, k-means, decision trees, backpropagation and attention very well, and the site, trace module and series are already built. Costs: the repo name no longer describes everything in it, and Java is not what ML practitioners use, so the articles teach how the algorithm works, not how to use PyTorch. Open question for Michael: which he means by "ML and AI" (classic algorithms and neural networks from scratch, or building with LLMs), since the second fits `system-design/` better.

Decided by Michael on 2026-11-27: "algorithms from scratch, create the machine-learning module". Module `machine-learning/` (package `learn.ml`) and `topics/machine-learning.md` created on branch `machine-learning-module`. The catalogue entries were drafted by Claude, not asked for one by one.

### 2026-11-27: did you add topics around neural networks and all the different algorithms and how to build an LLM

Mostly yes in the first draft: a neural networks section (neuron to backpropagation, a small autodiff engine, convolutional and recurrent networks) and a language models section ending in "A small GPT, trained on a small text". Gaps Claude found on re-reading and then added: preparing training data, the training loop and perplexity, causal masking, loading GPT-2 weights, fine-tuning, instruction tuning, encoder and decoder variants, plus VAEs, GANs, diffusion models and graph neural networks.
