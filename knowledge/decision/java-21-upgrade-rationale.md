---
version: 0.1.0-draft
tags: [decision, java, upgrade, rationale]
name: java-21-upgrade-rationale
category: decision
summary: Java 17 → 21 + Spring Boot 3.5.x upgrade rationale and required Gradle/JVM flag adjustments
source:
  kind: project
  ref: lucida-audit@65ff568
  commits: [7f611b9, c1db2c4, 665a58f]
confidence: high
---

# Fact

Spring Boot 3.5.11 with Java 21 toolchain is the chosen baseline for the microservice fleet. Java 17 no longer used.

# Why

- **Virtual threads** (Project Loom, JEP 444): relevant for the audit ingest path where Kafka listeners and MongoDB writes are IO-bound.
- **Generational ZGC / shenandoah improvements**: lower p99 GC pause for long-running services.
- **Pattern matching / sealed classes / records** fully stabilized — cleaner domain modelling.
- **Spring Boot 3.5** baseline requires Java 17 minimum; 21 is the LTS head and gets security patches longest.

# How to apply

When upgrading a peer microservice in the same fleet:

1. `java { toolchain { languageVersion = JavaLanguageVersion.of(21) } }` in `build.gradle`.
2. Add `--add-opens java.base/java.net=ALL-UNNAMED` and `java.base/java.lang=ALL-UNNAMED` to `bootRun.jvmArgs` — required by reflection-heavy libraries (Jackson, Spring, Mockito).
3. Verify reflection-based libraries: Lombok ≥1.18.30, Mockito ≥5, ByteBuddy current, Querydsl APT plugin compatible.
4. CI builders must have JDK 21 available; confirm Jenkins/GitLab agents before merging.

# Counter / Caveats

- Some APM agents and bytecode instrumentation tools lag Java 21 support — verify your observability stack first.
- Virtual threads are **not** a drop-in replacement for everything: pinning via `synchronized` blocks still applies; prefer `ReentrantLock`.
