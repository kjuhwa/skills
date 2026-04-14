# Dockerfile for Playwright Java services

## Problem

Packaging Playwright apps by hand means apt-getting Chromium deps, matching driver ↔ browser versions, and debugging `libnss3` errors at runtime. Building and running in the same heavy image also wastes image size.

## Pattern

Two stages: a slim Maven+JDK **build** stage that produces a fat jar, and Microsoft's **official Playwright Java runtime** as the final stage — it already ships with the matching browsers and all system libraries.

```dockerfile
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -q -DskipTests dependency:go-offline
COPY src ./src
RUN mvn -q -DskipTests package

FROM mcr.microsoft.com/playwright/java:v1.53.0-noble
WORKDIR /app
COPY --from=build /app/target/my-app-0.0.1.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java","-jar","/app/app.jar"]
```

Key moves:

- **`dependency:go-offline` on its own layer** before copying `src/` — Maven's dependency cache is reused on every code-only rebuild.
- **Runtime tag matches the Playwright Java version** from `pom.xml` (e.g. `v1.53.0-noble` ↔ `playwright 1.53.0`). Mismatches produce runtime driver errors.
- **No extra `RUN apt-get install`** — the official image already has Chromium/Firefox/Webkit plus fonts.

## When to use

- Any JVM service (Spring Boot, Micronaut, Quarkus, plain Java) that drives Playwright in production.
- CI jobs that run Playwright integration tests in a Java project.

## Pitfalls

- **Version drift.** If you bump `playwright.version` in `pom.xml`, bump the runtime image tag in lockstep, or the Java client will download a new driver at startup (slow, flaky, fails offline).
- **Multi-arch tags differ.** The `-noble` tag is amd64+arm64 on recent versions — pin exactly to avoid surprise arch mismatches on Apple Silicon CI runners.
- **`--no-sandbox` is still required in most container runtimes** even on this image (Kubernetes seccomp, rootless Docker). Set it via `LaunchOptions.setArgs(List.of("--no-sandbox", "--disable-dev-shm-usage"))` in code, not in the Dockerfile.
- **The image is ~1.5 GB.** If size matters, build a custom image with only `playwright-deps` and install just Chromium — but you take over the version-matching burden.
- **Don't run as root in prod.** Add a `USER pwuser` line (the official image already creates this user) after `COPY`.
