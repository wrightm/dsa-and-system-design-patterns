plugins {
    // Lets Gradle download the JDK named in the toolchain if it is not installed.
    id("org.gradle.toolchains.foojay-resolver-convention") version "1.0.0"
}

rootProject.name = "dsa-and-system-design-patterns"

include(
    "data-structures",
    "algorithms",
    "concurrency",
    "oo-design",
    "design-patterns",
    "enterprise-integration-patterns",
    "distributed-systems",
    "microservices-patterns",
    "system-design",
    "library-studies",
    "challenges",
    "benchmarks",
)
