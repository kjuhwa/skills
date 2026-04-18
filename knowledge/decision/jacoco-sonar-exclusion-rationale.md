---
version: 0.1.0-draft
tags: [decision, jacoco, sonar, exclusion, rationale]
name: jacoco-sonar-exclusion-rationale
description: Classes under config/, dto/, entity/, kafka/, avro/, exception/, advice/, schedule/, service/websocket/, and generated Q-classes are excluded from Jacoco coverage gates. Only business logic (routers, guards, services) is measured.
category: decision
confidence: high
source:
  kind: project
  ref: lucida-realtime@336a1e2
---

# Jacoco/SonarQube Exclusion Strategy

## Fact
lucida-realtime's `build.gradle` defines three exclusion sets:
- `exclusionPatterns` — applied to Jacoco coverage report AND coverage verification AND sonar coverage exclusions.
- `sonarExclusionPatterns` — subset applied to SonarQube source analysis.
- `testExclusionPatterns` — applied to test execution (e.g. `**/temp/**`).

Excluded from coverage: `*Application*`, `advice/`, `config/`, `constants/`, `avro/`, `kafka/`, `mqtt/`, `dto/`, `entity/`, `exception/`, `executor/`, `helper/`, `repository/`, `schedule/`, `service/websocket/`, `domain/`, `annotation/`, `dictionary/`, `event/`, and all Querydsl `Q*` classes.

## Why
Coverage gates should measure business logic, not infrastructure. Including auto-generated code (Avro, Querydsl Q), framework glue (`config/`), and thin data holders (`dto/`, `entity/`) produces metrics dominated by trivial getter/setter lines and artificially inflates or deflates coverage based on boilerplate.

The explicit carve-out communicates the team's testing strategy: test the stuff that has behavior (services, routers, guards, interceptors with logic). Don't test the stuff that is declarative (config wiring, DTOs, exception types).

## Evidence
- `build.gradle` lines 27–79 define the exclusion arrays.
- `jacocoTestCoverageVerification` consumes `exclusionPatterns` on `element = 'CLASS'`.
- `sonar.coverage.exclusions` reuses the same list.

## How to apply
When starting a new Spring Boot project with coverage gates:
1. Reject the default "100% of everything" gate — you will fight Jacoco forever.
2. Excluded by convention:
   - Auto-generated (Avro, Protobuf, Querydsl, MapStruct impl).
   - Declarative (config/, dto/, entity/).
   - Framework contracts that have no branch logic (exception types, enums, constants).
3. Include everywhere else: services, routers, interceptors, guards, repositories with custom queries.
4. Keep ONE canonical list in `ext { exclusionPatterns = [...] }` and reuse — do not drift three copies.

## Counter / Caveats
- `dto/` exclusion hides equals/hashCode bugs on records that have them overridden manually. If you hand-write `equals`, move that file out of `dto/` or add a targeted test.
- `service/websocket/` is excluded here because this project's WebSocket handlers are integration-tested, not unit-tested. If your project unit-tests handlers, do not exclude them.
- Exclusions are not a license to skip tests — they are a scope statement.
