# Topic catalogue

Everything this repo intends to cover, as checklists. There is no required order: topics are written as they come up in coding challenges and day-to-day work.

| Catalogue | Code lives in |
|---|---|
| [Foundations](foundations.md) | wherever first needed |
| [Data structures](data-structures.md) | `data-structures/` |
| [Algorithms](algorithms.md) | `algorithms/` |
| [Concurrency](concurrency.md) | `concurrency/` |
| [Object-oriented design](oo-design.md) | `oo-design/` |
| [Design patterns](design-patterns.md) | `design-patterns/` |
| [Enterprise integration patterns](enterprise-integration-patterns.md) | `enterprise-integration-patterns/` |
| [Distributed systems](distributed-systems.md) | `distributed-systems/` |
| [Microservices patterns](microservices-patterns.md) | `microservices-patterns/` |
| [System design case studies](system-design.md) | `system-design/` |
| [Library studies](library-studies.md) | `library-studies/` |

## How to read an entry

```
- [ ] **LRU cache** — needs: hash map, doubly linked list · wild: LinkedHashMap, Caffeine
```

- `[ ]` not started, `[x]` published. A published entry's name links to its article.
- **needs** lists what helps to know first. It is advice, not a gate: if a prerequisite has no article yet, the article that needs it carries a short primer.
- **wild** names real implementations worth reading alongside it.

## Keeping it current

- Starting a topic: `scripts/new-topic.sh <module> <slug> "Title"`.
- Publishing a topic: tick its box and link the name to the article.
- Met something that is not listed: add it to the right file. The lists are meant to grow.
