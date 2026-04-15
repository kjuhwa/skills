---
name: stub-in-service-unblocks-fe-parallelism
description: Emit stub return values inside generated Service methods (tagged `// STUB:`) so FE can connect to a live BE without waiting on business logic
category: decision
source:
  kind: project
  ref: polestar10-auto-pipeline@b0f1c9d
confidence: high
linked_skills: []
tags: [codegen, stub, fe-be-parallelism, hexagonal, service-layer]
---

**Fact:** Skeleton-only BE codegen (TODO bodies, no return) blocks FE until business logic lands, creating the classic FE-waits-on-BE bottleneck. The fix is emitting stub return objects built from the OpenAPI response schema/examples **inside the Service method**, marked with `// STUB:` for grep-based replacement. Port/Adapter/Repository stay untouched. The BE boots without a DB, FE wires up immediately, BE devs later replace each stub body with the real port call.

**Why:** Alternatives considered and rejected:
- External mock server (e.g. Prism) — FE teams don't actually run it.
- Stub in Adapter — fails at startup without DB config wired.
- Stub in Service — works standalone, swap surface is one method body.

**How to apply:**
- Source stub values from the OpenAPI `example`/`schema` already required for the contract — no extra input needed.
- Mark with a grep-friendly sentinel (`// STUB:` or equivalent) so `grep -r "// STUB:"` enumerates all remaining work.
- Keep ports/adapters fully generated even though unused initially, so replacement is a one-liner later.
- Document the stub's limitation: static responses don't reflect state changes (create → list won't update). That's acceptable because early FE needs layout/binding, not persistence.

**Evidence:**
- Internal design-decisions doc §6 — full alternative table and rationale.
- Project CLAUDE.md core principles — codified.
