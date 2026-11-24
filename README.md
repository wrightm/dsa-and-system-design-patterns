# DSA and system design patterns, in Java

[![build](https://github.com/wrightm/dsa-and-system-design-patterns/actions/workflows/ci.yml/badge.svg)](https://github.com/wrightm/dsa-and-system-design-patterns/actions/workflows/ci.yml)

Data structures, algorithms, design patterns and distributed system patterns, each one built from scratch in Java, tested, and written up as an article.

**Read the articles:** <https://wrightm.github.io/dsa-and-system-design-patterns/>

## What makes these articles different

Every article does three things that most tutorials skip:

1. **It starts from the version that fails.** The naive approach comes first, with the exact point where it breaks, so the real design is a fix for a problem you have just seen.
2. **It reads production source.** Each topic is compared with how the JDK or an open source library does it, with links pinned to a release tag and a table of the decisions made and what each one cost.
3. **It keeps the questions.** The confusions that came up while learning the topic are logged and answered in the article.

Every claim in an article is backed by a test in this repo that you can run. The animations are too: each one replays steps recorded from the real implementation by a test, so it can only show what the code actually did. On GitHub, and on the site without JavaScript, the same animation appears as a still image.

## Published so far

| # | Article | Domain |
|---|---|---|
| 1 | [Hash map: from a list of pairs to java.util.HashMap](data-structures/src/main/java/learn/ds/hashmap/README.md) | Data structures |

The full list of planned topics, about 900 of them, is in the [topic catalogue](topics/README.md). Topics are written in the order they come up in practice, not in curriculum order, so each article states what it assumes.

## Run it

You need any JDK from 17 up to start Gradle. Gradle downloads JDK 25 for the build itself.

```bash
./gradlew build                          # compile, test and check formatting
./gradlew :data-structures:test          # one module
./gradlew spotlessApply                  # fix formatting
./gradlew test -Ptraces.update           # rewrite the traces behind the animations
./gradlew :benchmarks:jmh -Pjmh.include=MapLookupBenchmark
```

## How the repo is laid out

One Gradle module per domain, one package per topic. A topic's folder holds its code, its article and its question log together.

```
data-structures/src/main/java/learn/ds/hashmap/
├── ChainedHashMap.java     the implementation
├── README.md               the article
├── NOTES.md                questions asked while learning it
└── animations/             recorded traces and their still images
data-structures/src/test/java/learn/ds/hashmap/
├── ChainedHashMapTest.java the tests the article refers to
└── HashMapScenarios.java   the scenarios that record the traces
```

| Module | Package | What goes in it |
|---|---|---|
| [`data-structures`](data-structures/) | `learn.ds` | Structures built from scratch |
| [`algorithms`](algorithms/) | `learn.algo` | Algorithms and problem-solving patterns |
| [`concurrency`](concurrency/) | `learn.concurrency` | Threads, locks, lock-free code, executors |
| [`oo-design`](oo-design/) | `learn.ood` | Principles and low-level design case studies |
| [`design-patterns`](design-patterns/) | `learn.patterns` | GoF, architectural, enterprise and DDD patterns |
| [`enterprise-integration-patterns`](enterprise-integration-patterns/) | `learn.eip` | The Hohpe and Woolf messaging patterns |
| [`distributed-systems`](distributed-systems/) | `learn.distributed` | Replication, consensus, storage, resilience |
| [`microservices-patterns`](microservices-patterns/) | `learn.microservices` | Decomposition, data, communication, deployment |
| [`system-design`](system-design/) | `learn.sysdesign` | Design case studies |
| [`library-studies`](library-studies/) | `learn.libstudy` | Reading JDK and open source library code |
| [`challenges`](challenges/) | `learn.challenges` | Coding challenge solutions, linked to the topics they use |
| [`benchmarks`](benchmarks/) | `learn.bench` | JMH benchmarks behind performance claims |
| [`trace`](trace/) | `learn.trace` | Records the steps an implementation takes, for the animations |

Other folders: [`topics/`](topics/README.md) is the catalogue, [`templates/`](templates/) holds the article templates, [`site/`](site/) builds the website (a Next.js static export; [CONTRIBUTING.md](CONTRIBUTING.md#preview-the-site-locally) shows how to preview it), and [`blog/linkedin/`](blog/linkedin/) keeps the post that announces each article.

## Start a new topic

```bash
scripts/new-topic.sh algorithms binary-search "Binary search"
```

That creates the package, the article from the template (as a draft), the question log and a test class. [CONTRIBUTING.md](CONTRIBUTING.md) describes the standard an article has to meet before it is published.

## Licence

[MIT](LICENSE). Use the code and the text however helps you.
