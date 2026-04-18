---
tags: [testing, spring, testcontainers, multitenant, base]
name: spring-testcontainers-multitenant-base
description: Base test class that boots Testcontainers (Mongo + Kafka), pre-sets tenant/auth context, and forces JVM halt in AfterAll to avoid leaked containers.
trigger: Spring Boot + Testcontainers + multi-tenant code that reads TenantContextHolder / AuthContext in every service.
source_project: lucida-meta
version: 1.0.0
category: testing
---

# Multi-Tenant Testcontainers Base Class

## Shape

Two-layer base:

- `TestSupport` — `@SpringBootTest` + `@Testcontainers`, starts Mongo + Kafka + Schema Registry containers, sets `TenantContextHolder.set("test")` and a canned `AuthContext` (loginId=manager, locale=ko, fixed roleIds) in `@BeforeEach`.
- `BaseTest extends TestSupport` — adds `@MockitoBean` for Kafka producers that would otherwise emit during tests.

Gradle: `TESTCONTAINERS_REUSE_ENABLE=false` so containers are disposed after each test run regardless of `~/.testcontainers.properties`.

## Steps

1. Put container startup on `static` fields with `@Container` so JUnit 5 lifecycle owns them.
2. Expose dynamic bootstrap URIs via `@DynamicPropertySource` (Mongo URI, Kafka bootstrap, schema registry URL).
3. In `@BeforeEach`, always set tenant + auth context; in `@AfterEach`, clear them. A leaked `TenantContextHolder` poisons later tests.
4. Mock any outbound Kafka producer that publishes side-effects (audit, analytics) with `@MockitoBean`.
5. Tag experimental or WIP tests under `src/test/**/temp/**` and exclude that glob from the `test` task so CI stays green.

## Counter / Caveats

- Don't share containers across modules via reuse unless every test class cleans up state; test order becomes load-bearing otherwise.
- Do not set `TenantContextHolder` in a static initializer — Spring's thread pool will drop it on async operations; set per-test and propagate via a `TaskDecorator` when exercising `@Async` code.
- Forcing `System.exit` in `@AfterAll` hides real leaks; prefer fixing container lifecycle first, reach for halt only when a third-party library spawns non-daemon threads you cannot kill.
