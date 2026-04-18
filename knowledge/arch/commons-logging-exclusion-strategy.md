---
version: 0.1.0-draft
tags: [arch, commons, logging, exclusion, strategy]
name: commons-logging-exclusion-strategy
category: arch
summary: Globally exclude commons-logging, log4j, and slf4j-log4j12 in Gradle so SLF4J+Logback is the only logging backend on the classpath
source:
  kind: project
  ref: lucida-audit@65ff568
  path: build.gradle:112-115
confidence: high
---

# Fact

```groovy
configurations.configureEach {
    exclude group: "commons-logging", module: "commons-logging"
    exclude group: "org.slf4j",       module: "slf4j-log4j12"
    exclude group: "log4j",           module: "log4j"
}
```

# Why

- Classpath scanning for logging bindings is first-match-wins. A transitive `commons-logging` or `slf4j-log4j12` binding silently overrides the intended Logback backend — logs vanish or route to an unconfigured file.
- Spring Boot's `spring-jcl` provides commons-logging API bridging without the classic implementation, so the exclude is safe.
- log4j 1.x (the `log4j:log4j` artifact) is end-of-life; excluding it prevents accidental inclusion via legacy transitive deps.

# How to apply

- Apply to every module in the fleet via a shared `buildSrc` or convention plugin — don't copy-paste into every `build.gradle`.
- When adding a new dependency, run `./gradlew dependencies | grep -E "commons-logging|log4j"` to confirm the exclude is effective.
- Pair with `logback-spring.xml` as the canonical log config.

# Counter / Caveats

- If a third-party library at runtime uses `Log4jLoggerFactory` directly (not via SLF4J), excluding log4j will `ClassNotFoundException`. In that rare case, add a targeted exclude-and-replace (e.g. `log4j-over-slf4j` bridge) instead of blanket exclude.
