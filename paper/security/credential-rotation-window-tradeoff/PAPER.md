---
version: 0.2.0-draft
name: credential-rotation-window-tradeoff
description: "Credential overlap window: hypothesis 24-48h is optimal — risk grows linear, ops gain saturates fast (vs typical 7-30d)"
category: security
tags: [credential-rotation, overlap-window, security-tradeoff, hypothesis]
type: hypothesis

premise:
  if: Credential overlap window length is varied
  then: Security risk grows linearly with window (broader compromise surface) while operational simplicity (fraction of clients migrated) grows logarithmically. Optimal window is shorter than common practice — 24-48h captures ≥95% of clients while keeping security exposure 7-15x smaller than the typical 7-30d window.

examines:
  - kind: skill
    ref: security/aes256gcm-machineid-credential-store
    role: credential-store-shape
  - kind: skill
    ref: llm-agents/hermes-credential-pool-failover
    role: rotation-with-failover-shape
  - kind: knowledge
    ref: pitfall/refresh-token-do-not-regenerate
    role: rotation-counter-evidence
  - kind: knowledge
    ref: pitfall/circuit-breaker-implementation-pitfall
    role: emergency-revocation-context

perspectives:
  - name: Risk Scales Linearly with Time
    summary: Compromise during the window gives attacker time-bounded access. Window length is the bound. Doubling window doubles exposure.
  - name: Migration Saturates Logarithmically
    summary: Most clients migrate in the first hour; the long tail of stragglers contributes diminishing return per additional day.
  - name: Operational Risk vs Security Risk
    summary: Short window risks failing migrations (clients miss deadline). Long window risks security drift. The tradeoff is non-symmetric — security is the more expensive failure mode.
  - name: Emergency Revocation
    summary: Optimal window length matters less when emergency revocation works well. Untested emergency revocation pushes the optimal window UP (because we'd rely on grace).

external_refs: []

proposed_builds:
  - slug: rotation-window-simulator
    summary: Simulator that takes a client migration distribution + assumed compromise probability per hour, computes total expected risk + total migration completeness for window lengths {1h, 6h, 24h, 72h, 1w, 4w}.
    scope: poc
    requires:
      - kind: skill
        ref: security/aes256gcm-machineid-credential-store
        role: realistic-credential-shape
      - kind: knowledge
        ref: pitfall/refresh-token-do-not-regenerate
        role: failure-modes-to-account-for

experiments:
  - name: window-length-cost-curve
    hypothesis: At window=24h, ≥95% of clients migrated AND total risk ≤15% of a 7d window's risk. At window=1h, migration completeness drops below 70% (too short).
    method: Run simulator with realistic client-migration distributions from production telemetry; plot risk vs completeness curves.
    status: planned
    built_as: null
    result: null
    supports_premise: null
    observed_at: null

outcomes: []

status: draft
retraction_reason: null
---

# Credential Rotation Window: Sweet Spot

## Premise

(see frontmatter)

## Background

`technique/security/credential-rotation-overlap-window` describes the overlap-window shape but leaves window length as "domain choice." Industry default of 7-30d is rarely revisited. This paper proposes shorter is better.

<!-- references-section:begin -->
## References (examines)

**skill — `security/aes256gcm-machineid-credential-store`**
credential-store-shape

**skill — `llm-agents/hermes-credential-pool-failover`**
rotation-with-failover-shape

**knowledge — `pitfall/refresh-token-do-not-regenerate`**
rotation-counter-evidence

**knowledge — `pitfall/circuit-breaker-implementation-pitfall`**
emergency-revocation-context


## Build dependencies (proposed_builds)

### `rotation-window-simulator`  _(scope: poc)_

**skill — `security/aes256gcm-machineid-credential-store`**
realistic-credential-shape

**knowledge — `pitfall/refresh-token-do-not-regenerate`**
failure-modes-to-account-for

<!-- references-section:end -->

## Perspectives

(see frontmatter)

## Limitations

- Migration distributions vary wildly across deployments; this paper's claim assumes mid-quartile distributions
- "Compromise probability per hour" is hard to ground empirically; uses worst-case assumption
- Does not account for organizational constraints (PR-cycle deadlines, ticket-based rotation)

## Provenance

- Authored 2026-04-25, batch of 10
