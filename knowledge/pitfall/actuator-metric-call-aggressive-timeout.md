---
version: 0.1.0-draft
tags: [pitfall, actuator, metric, call, aggressive, timeout]
name: actuator-metric-call-aggressive-timeout
description: Use aggressive HTTP timeouts (100ms–1s) for /actuator/health and /actuator/metrics polling, but keep long timeouts for /actuator/threaddump and /actuator/heapdump — mixing them stalls the collector.
type: pitfall
category: pitfall
source:
  kind: project
  ref: lucida-health@51fd2f6,f9e7448,5a05e41
confidence: high
---

**Fact.** Health/metric endpoints are expected to answer in under ~50ms on a healthy service; if they don't, the target is de-facto unhealthy and the collector should fail fast and mark availability DOWN rather than block. Threaddump/heapdump on the same target can legitimately take seconds to minutes.

**Why.** Iterative tuning in this codebase moved connect timeout from defaults → 500ms → 1000ms → 100ms, because a single slow target was stalling the collector thread pool and starving other targets. The symptom: ticks skipped, availability metrics gapped. Separating slow/fast endpoints fixed it.

**How to apply.**
- Keep **two** HTTP client configurations (or two sets of per-call timeouts): fast-path (connect ≤ 1s, read ≤ 2s) for `/actuator/health` and `/actuator/metrics/**`; slow-path (connect 5–10s, read 60s+) for `/actuator/threaddump`, `/actuator/heapdump`, `/actuator/env`.
- Never run heavy endpoints on the same scheduler tick as the fast metric loop — dispatch them on a separate, bounded executor.
- Expose per-target timeout overrides; on-LAN targets can drop to 100ms connect safely, WAN targets need 1–3s.

**Counter / Caveats.** 100ms is below some JVM GC pauses — if the *target* GCs during the probe, you'll mark it DOWN spuriously. Accept this as a DOWN signal (GC pause *is* an availability incident) or use ≥500ms on targets with known GC spikes.
