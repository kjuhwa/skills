---
version: 0.1.0-draft
tags: [arch, lucida, framework, gate, annotations]
name: lucida-framework-gate-annotations
description: Internal framework (lucida-framework-*) uses opt-in annotations (@EnabledMessage, @EnableDataExport, @EnableSchedule, @EnableCommand) on the Application class to gate auto-config; omitting one silently disables the feature.
type: knowledge
category: arch
source:
  kind: project
  ref: lucida-meta@c55568a
confidence: high
---

# Lucida Framework Feature-Gate Annotations

## Fact

`com.nkia.lucida.framework.*` exposes feature-gate annotations on `@SpringBootApplication` classes:

- `@EnabledMessage` — enables i18n loader + Kafka sync topics (`MessageChangedTopicAvro`, `MessageLoadedTopicAvro`).
- `@EnableDataExport` — enables export service auto-config.
- `@EnableSchedule` — enables Quartz + ShedLock wiring.
- `@EnableCommand` — enables `Command` job registration.
- `@EnableAuditConfig`, `@EnableDiscovery`, `@EnableCaching` (standard Spring).

All currently applied in `lucida-meta` `Application.java`.

## Why it matters

- Without the annotation, the framework auto-config is **silent** — no bean, no warning, feature simply absent.
- New services cloned from a minimal template frequently ship with messages loading from an empty MongoDB because `@EnabledMessage` was dropped.

## How to apply

- When bootstrapping a new Lucida-based service, start by listing required features and adding the matching `@Enable*` annotation on `Application`.
- When diagnosing "feature X isn't working" in a Lucida service, first verify the enable annotation is present *before* chasing configuration values.
- Document the required gate in any README or CLAUDE.md for the new service so clones preserve it.
