# Benchmarks

JMH benchmarks that back the performance claims made in articles. Package root: `learn.bench`, with one sub-package per topic.

```bash
./gradlew :benchmarks:jmh                                   # everything
./gradlew :benchmarks:jmh -Pjmh.include=MapLookupBenchmark  # one benchmark
```

The default settings (2 warm-up iterations, 3 measurements, 1 fork) are quick and noisy. They show the shape of a result, not a number to quote. Before putting a figure in an article, raise the iterations and forks and record the run in the topic's `NOTES.md`.

A benchmark that needs code from another module adds it in `build.gradle.kts`, for example `jmh(project(":algorithms"))`.
