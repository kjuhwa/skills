---
version: 0.1.0-draft
name: credential-rotation-overlap-window
description: "Credential rotation with overlap window: old + new accepted simultaneously during transition; timed cutover; audit trail"
category: security
tags:
  - credential
  - rotation
  - overlap-window
  - zero-downtime
  - audit

composes:
  - kind: skill
    ref: security/aes256gcm-machineid-credential-store
    version: "*"
    role: credential-storage-baseline
  - kind: skill
    ref: llm-agents/hermes-credential-pool-failover
    version: "*"
    role: rotation-with-failover-shape
  - kind: knowledge
    ref: pitfall/refresh-token-do-not-regenerate
    version: "*"
    role: rotation-counter-evidence

binding: loose

verify:
  - "every composes[].ref is installed in the hub"
  - "the overlap window is bounded; cutover happens automatically at end of window"
---

# Credential Rotation with Overlap Window

> Both old and new credentials are accepted during a bounded overlap window; clients migrate at their own pace; at window end, only new is accepted. Distinguished from instant rotation (causes downtime) and from indefinite multi-credential acceptance (security drift).

<!-- references-section:begin -->
## Composes

**skill — `security/aes256gcm-machineid-credential-store`**  _(version: `*`)_
credential-storage-baseline

**skill — `llm-agents/hermes-credential-pool-failover`**  _(version: `*`)_
rotation-with-failover-shape

**knowledge — `pitfall/refresh-token-do-not-regenerate`**  _(version: `*`)_
rotation-counter-evidence

<!-- references-section:end -->

## When to use

- Distributed clients cannot all be updated atomically (mobile apps, third-party integrations)
- Brief downtime for re-auth is unacceptable
- Compliance allows short windows (typically hours-to-days) of dual-credential validity

## When NOT to use

- Single-tenant single-client system (instant rotation is simpler)
- Compromise scenario — old credential MUST be revoked immediately, no overlap
- Compliance requires single-credential-only at every instant

## Phase sequence

```
[old issued]
     │
     ▼
[generate new] ─► [overlap window starts: both accepted]
                              │
                              │  clients migrate at own pace
                              │  audit log every credential use
                              ▼
                  [window end timer fires]
                              │
                              ▼
                  [revoke old] ─► [only new accepted]
```

## Glue summary (net value added)

| Added element | Where |
|---|---|
| Overlap window has a hard timer; cutover is automatic, not manual | Window management |
| Audit log every credential use (which one + by whom + when) so unmigrated clients are visible | During window |
| Pre-revocation check: warn if any unmigrated clients in last N hours of window | Before cutover |
| Emergency early-revocation path: bypass window if compromise detected | Exception handling |

## Known limitations

- Window length is a security/operational tradeoff; no universal value
- Old credential exists in two places (issuer + validator) for the window — broader attack surface during transition
- Audit log volume can be significant; needs retention policy

## Provenance

- Authored 2026-04-25, pilot in 10-technique batch
- Sibling: saga (#5) shares "transitional state" pattern but with compensation, not overlap
