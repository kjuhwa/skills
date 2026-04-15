---
name: resource-mount-unmount-use-jar-defaults
description: Don't bind-mount i18n/exception/menu resource files into Spring Boot containers; let the jar ship its own defaults
category: decision
source:
  kind: project
  ref: lucida-for-docker@674299e,6a7e27b
confidence: high
---

# Don't bind-mount i18n / exception / menu resources — use jar-internal defaults

## Decision
Do **not** bind-mount externalized resource files (`messages_*.properties`, `exception_*.properties`, `menu_*.json`, etc.) into Spring Boot service containers. Let the container use the files baked into the jar. Only mount when a site specifically needs to override them.

## Why
- Mounted resource files drift against jar-internal ones across releases, producing silent mismatches (missing keys, stale labels).
- Release rollouts require syncing both the jar **and** the mounted files — an easy-to-miss second step.
- Overrides are the exception, not the rule — make the override the opt-in, not the default.

## Evidence
- Commit `674299e`: `issue #83466 리소스(menu_*) 마운트 해제. jar 내부 파일 사용하는 것으로 정의.`
- Commit `6a7e27b`: `issue #83466 리소스(exception_*, messages_*) 마운트 해제. jar 내부 파일 사용하는 것으로 정의.`

## How to apply
- New service compose entries: no `./resources:/app/config` style mount unless there's a concrete override need.
- Migrating existing services: audit mounts, remove unused ones, and document the remaining few as "override — keep in sync with release X.Y.Z".
- For true i18n customization, prefer a dedicated override volume + Spring `spring.messages.basename` with a fallback chain rather than replacing the default bundle wholesale.

## Counter / Caveats
Customer-specific branding or legal text that differs per tenant still warrants a mount — but that's a product decision, not a default.
