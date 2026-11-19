# Working rules for Claude sessions in this repo

This is a public learning repo. Each topic has working Java code, tests and an article that other people learn from. Michael picks topics up in whatever order he meets them, so never assume an earlier topic has been written.

## Capture every question

Michael's questions are raw material for the articles. This is the most important rule here.

- When he asks a question about a topic, append it to that topic's `NOTES.md` under "Questions", dated (`### YYYY-MM-DD: question`), in his words, followed by the answer or example that actually resolved it. Do this in the same turn as answering.
- If the topic has no folder yet, append to `docs/question-inbox.md` under a heading for the topic. When the topic is scaffolded, move its entries into the new `NOTES.md`.
- Log follow-ups and wrong turns too. A misunderstanding that took three attempts to clear is worth more to a reader than a clean answer.
- Never invent a question and present it as his. If you seed an article with questions he did not ask, say so in `NOTES.md`.

## Writing or revising an article

- Read the topic's `NOTES.md` first and build the "Questions that came up" section from it.
- Follow `templates/ARTICLE.md` and the standard in `CONTRIBUTING.md`. The hash map article is the reference.
- Each article needs an angle of its own: start from the approach that fails, read real source code, and answer the real questions. Do not restate what a standard tutorial says.
- Verify before you write. Open the library source at a pinned tag and check every constant, line number and behaviour you quote. Anything not checked goes in `NOTES.md` under "Loose ends", not in the article.
- Every behavioural claim points at a test in this repo. Every performance number comes from a JMH run recorded in the notes.
- Plain language, British spelling, standard Markdown, Mermaid for diagrams. No GitHub-only alert syntax (the site build does not render it).

## Starting and finishing a topic

- Start with `scripts/new-topic.sh <module> <slug> "Title"`. Add the topic to `topics/` if it is missing.
- A topic is not done, and its article is not `status: published`, until: `./gradlew build` passes, `python3 scripts/check-links.py` passes, and every template section is filled.
- On publishing: set `status`, `date`, `summary` and the next `series` number in the front matter; tick the catalogue entry and link it to the article; add a row to the table in the root `README.md`; draft `blog/linkedin/NNN-<slug>.md`.
- When a challenge solution in `challenges/` uses a topic, link it from that article's "Seen in" line, and link the article from the solution.

## Build

- `./gradlew build` compiles with warnings as errors, runs tests and checks formatting. Run `./gradlew spotlessApply` before it.
- Java 25 through the Gradle toolchain. Versions live in `gradle/libs.versions.toml`. JUnit stays on 5.x while jqwik depends on JUnit Platform 1.x.
- Shared build logic is in `buildSrc/src/main/kotlin/learn.java-conventions.gradle.kts`.
- A topic that needs heavy dependencies (Spring, Kafka, Testcontainers) becomes its own nested subproject so the dependency does not leak into the rest of its module.

## Publishing outside the repo

- Pushing to `main` deploys the website. Only push when asked.
- Nothing is posted to LinkedIn, or anywhere else outside GitHub, without Michael approving the exact text first.
