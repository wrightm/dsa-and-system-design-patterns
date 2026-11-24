# Notes: Hash map

Raw working notes for the article in this folder. Not published. Questions are logged as they are asked, with the answer that resolved them, so the article can draw on real confusions.

## Questions

> The five questions in the article's "Questions that came up" section were seeded by Claude on 2026-11-18 while drafting the exemplar. They are the questions learners most often get stuck on, not questions Michael asked. Replace or add to them as real ones come up.

<!-- Format:
### YYYY-MM-DD: the question, in the words it was asked
What resolved it. Link to code, a test, or a source file if that is what made it click.
-->

## Verified against source (jdk-25-ga)

- Constants and line numbers quoted in the article were read from `HashMap.java` at the `jdk-25-ga` tag on 2026-11-18.
- Float spreading figures (1 bucket without, 255 with, capacity 1024) come from `spreadingRescuesKeysThatDifferOnlyInTheirHighBits`.

## Loose ends

- The article quotes no benchmark numbers. Run `MapLookupBenchmark` with longer settings before adding any.
- "Seen in" is empty until a challenge solution uses a hash map.
- The Mental model diagram uses an invisible `I ~~~ B0` link and blank spacer nodes so Mermaid draws the buckets in order (0 to 4). Checked with Mermaid 12.3.0 on the site on 2026-11-23; not yet checked on github.com, which renders with its own Mermaid version.
