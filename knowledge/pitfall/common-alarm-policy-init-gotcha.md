---
version: 0.1.0-draft
name: common-alarm-policy-init-gotcha
description: Policy loader that "only runs on first boot if records exist" silently skips later-added policies for tenants that started empty
category: pitfall
source:
  kind: project
  ref: lucida-alarm@d6ae7d27
confidence: medium
linked_skills:
  - kafka-debounce-event-coalescing
tags: [initialization, bootstrap, tenant, policy-loader, silent-failure]
---

**Fact:** A one-shot "load existing policies into memory" bootstrap that guards on `count(policies) > 0` to avoid cost on never-used tenants leaks into the new-tenant path: if policies are added **after** first boot via the UI, the loader may not re-run, and the policies never activate until an explicit re-trigger or restart.

**Why:** The early-exit was intended as a performance optimization for unused tenants but doubles as a silent skip on late-added data. Users see their policies in the DB but no alarms — a classic "the feature is there but doesn't fire" trap.

**How to apply:**
- Seed a sentinel policy at tenant provisioning so the loader always finds ≥ 1 record.
- Or, publish a `PolicyCheckEvent` (or equivalent debounced re-evaluation trigger — see `kafka-debounce-event-coalescing`) after every policy mutation so the consumer re-scans.
- When writing loaders, prefer **idempotent per-change re-eval** over "run once at boot if bootstrapped".
- Audit any "load on startup only if X" guards for this same shape — they almost always have a late-data gotcha.

**Evidence:**
- Commit `e7c68bf9` — "공통알람정책은 초기 구축시만 로딩되고 데이터가 추가된 후 삭제되어도 다시 추가되지 않음. 데이터가 1건이라도 있으면 로딩하지 않음."
- `common-alarm-policy-implementation-progress.md`

**Counter / Caveats:** Confidence is medium — this behaviour may have been revised in later commits; verify against current source before recommending a workaround.
