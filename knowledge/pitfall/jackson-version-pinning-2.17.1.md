---
version: 0.1.0-draft
tags: [pitfall, jackson, version, pinning, 2.17.1]
name: jackson-version-pinning-2.17.1
category: pitfall
summary: Jackson must be pinned via Gradle resolutionStrategy across all com.fasterxml.jackson.* groups to avoid NoSuchMethodError from transitive version drift
source:
  kind: project
  ref: lucida-audit@65ff568
  path: build.gradle:120-128
confidence: high
---

# Fact

All Jackson modules (`core`, `dataformat`, `datatype`, `module`) are forced to a single version (currently 2.17.1) via `resolutionStrategy.eachDependency`.

```groovy
resolutionStrategy.eachDependency { details ->
    if (details.requested.group.startsWith('com.fasterxml.jackson')) {
        details.useVersion '2.17.1'
    }
}
```

# Why

When Spring Boot BOM, Avro serializers, Springdoc, and Kafka clients each pull a different Jackson minor version, the classpath ends up with e.g. `jackson-core 2.16.x` but `jackson-databind 2.17.x`. Internal API changes between these produce runtime `NoSuchMethodError` or `AbstractMethodError` on the first JSON serialization — NOT at startup.

# How to apply

- When adding a new dependency that drags in Jackson, check `./gradlew dependencyInsight --dependency jackson-core` and confirm the forced version is applied.
- When Spring Boot upgrades push Jackson forward, bump the pinned version in lockstep — don't leave it behind, or you lose security fixes.
- Apply to ALL four groups: `core`, `dataformat`, `datatype`, `module`. Missing one leaks the mismatch.

# Counter / Caveats

- Pinning hides upstream bumps — subscribe to Jackson release notes and revisit quarterly.
- If a dependency genuinely requires a newer Jackson than the pinned version, it will fail at runtime with the opposite symptom. Consider `resolutionStrategy.force` with version ranges instead of strict pin in those cases.
