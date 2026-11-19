plugins {
    id("learn.java-conventions")
    alias(libs.plugins.jmh)
}

dependencies {
    jmh(project(":data-structures"))
}

jmh {
    jmhVersion = libs.versions.jmh
    // Short defaults so a benchmark finishes in about a minute. Raise these before trusting numbers.
    warmupIterations = 2
    iterations = 3
    fork = 1
    val include = providers.gradleProperty("jmh.include")
    if (include.isPresent) includes = listOf(include.get())
}
