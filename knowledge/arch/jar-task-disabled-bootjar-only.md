---
version: 0.1.0-draft
tags: [arch, jar, task, disabled, bootjar, only]
name: jar-task-disabled-bootjar-only
category: arch
summary: Gradle `jar` task is disabled so only `bootJar` produces an artifact — CI/Docker consumers never receive an ambiguous plain JAR
source:
  kind: project
  ref: lucida-audit@65ff568
  path: build.gradle:210-212
confidence: medium
---

# Fact

```groovy
tasks.named("jar") { enabled = false }
```

Only the Spring Boot fat JAR (`bootJar`) is produced.

# Why

- Running a plain JAR built by the `jar` task fails at runtime (no main-class manifest, no nested starter deps). Every developer who does so wastes an hour.
- Docker images built with `COPY build/libs/*.jar` would non-deterministically pick one or the other — bootJar vs plain jar — leading to "works on my machine" drift.
- CI artifact uploads are cleaner with exactly one output file per module.

# How to apply

- Standard pattern for every Spring Boot service module in the fleet.
- When a module genuinely needs a plain JAR (rare — library modules), that module should use the `java-library` plugin WITHOUT the `org.springframework.boot` plugin, not enable both.

# Counter / Caveats

- If a consumer of your artifact ever needs the pure-classes JAR (e.g. another module depending on your classes), use `jar { enabled = true }` AND publish under a classifier so bootJar remains the default.
