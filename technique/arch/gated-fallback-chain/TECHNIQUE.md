---
version: 0.1.0
name: gated-fallback-chain
description: Tiered fallback chain rolled out behind a feature flag, with circuit-breaker pitfall awareness — fail loud, not silent.
category: arch
tags: [fallback, circuit-breaker, feature-flag, resilience, composition]

composes:
  - kind: skill
    ref: ai/ai-call-with-mock-fallback
    role: fallback-shape
    note: >-
      The canonical 2-tier fallback baseline. Generalizable beyond AI calls — the
      technique's contribution is in extending this shape, not in the AI specificity.
    version: "*"
  - kind: skill
    ref: backend/conditional-feature-flag-rollout
    role: rollout-gate
    note: >-
      Wraps the entire fallback chain so it can be turned off if the chain itself
      proves unreliable. Revert is a config change, not a code ship.
    version: "*"
  - kind: knowledge
    ref: pitfall/circuit-breaker-implementation-pitfall
    role: silent-failure-warning
    note: >-
      The canonical failure mode the technique exists to prevent — silent fallback
      that hides the real problem from downstream consumers. Codifies what to
      surface explicitly instead of swallowing.

recipe:
  one_line: "Tiered fallback chain wrapped in a feature flag; each tier transition is surfaced explicitly to caller. Fail loud — never silent."
  preconditions:
    - "A primary call has a useful fallback path AND consequences of silent failure are non-trivial (data drift, billing surprise, regression masking)"
    - "Fallback chain is a new pattern in the codebase — needs a wire-level revert path while teams adapt"
    - "Failures of primary should be observable to caller even when fallback succeeds (downstream needs the tier-transition signal)"
  anti_conditions:
    - "Fallback is bulkhead isolation, not a chain — separate technique (workflow/fan-out-fan-in-with-bulkhead)"
    - "System tolerates true silent fallback (e.g. DNS resolution where any answer is acceptable)"
    - "Asynchronous / fire-and-forget calls — chain shape works for synchronous request/response paths only"
  failure_modes:
    - signal: "Fallback succeeds but caller unaware that primary failed — silent degradation in downstream metrics"
      atom_ref: "knowledge:pitfall/circuit-breaker-implementation-pitfall"
      remediation: "Surface tier-transition in response payload (e.g. tier-served field); log primary failure even when fallback handles it; alert on fallback rate > threshold"
  assembly_order:
    - phase: flag-check
      uses: rollout-gate
    - phase: primary-call
      uses: fallback-shape
      branches:
        - condition: "primary succeeds"
          next: return
        - condition: "primary fails"
          next: fallback-tier
    - phase: fallback-tier
      uses: fallback-shape
      branches:
        - condition: "fallback succeeds"
          next: return-with-transition-surface
        - condition: "fallback also fails"
          next: terminal-error
    - phase: return-with-transition-surface
      uses: fallback-shape
    - phase: terminal-error
      uses: fallback-shape

binding: loose

verify:
  - "every composes[].ref resolves on disk"
---

# Gated Fallback Chain

> A staged-fallback pattern with two safeguards: (1) the entire chain is rolled out behind a feature flag so it can be reverted at the wire level, (2) the chain explicitly surfaces tier transitions instead of silently degrading.

<!-- references-section:begin -->
## Composes

**skill — `ai/ai-call-with-mock-fallback`**  _(version: `*`)_
The canonical 2-tier fallback baseline. Generalizable beyond AI calls — the technique's contribution is in extending this shape, not in the AI specificity.

**skill — `backend/conditional-feature-flag-rollout`**  _(version: `*`)_
Wraps the entire fallback chain so it can be turned off if the chain itself proves unreliable. Revert is a config change, not a code ship.

**knowledge — `pitfall/circuit-breaker-implementation-pitfall`**
The canonical failure mode the technique exists to prevent — silent fallback that hides the real problem from downstream consumers. Codifies what to surface explicitly instead of swallowing.

<!-- references-section:end -->

## When to use

- A primary call (network, model, third-party API) has a useful fallback path AND the consequences of silent failure are non-trivial (data drift, billing surprise, regression masking).
- The fallback chain is a new pattern in the codebase — needs a wire-level revert path while teams adapt.
- Failures of the *primary* should be observable to the caller even when the *fallback* succeeds (e.g. tier-2 returned a degraded payload but everyone needs to know it wasn't tier-1).

## When NOT to use

- The fallback is bulkhead isolation, not a chain — separate technique (`workflow/fan-out-fan-in-with-bulkhead`).
- The system can tolerate true silent fallback (e.g., DNS resolution where any answer is acceptable). The pitfall reference becomes overkill.
- Asynchronous / fire-and-forget calls — the chain shape works for synchronous request/response paths; async semantics need a different decomposition.

## Phase sequence

```
caller → flag check → primary tier → [success] → return
                          ↓ fail
                       fallback tier → [success] → return WITH tier-transition surface
                          ↓ fail
                       terminal error → explicit failure (NOT a silent default)
```

- **Phase 0 (flag check)** — if the flag is off, route to the legacy non-fallback path. The chain only activates when the gate is open.
- **Phase 1 (primary)** — the canonical happy path. On success, no surface.
- **Phase 2 (fallback)** — runs only after primary fails. On success, must emit a tier-transition signal (header, structured log, metric) so the caller can distinguish tier-1 success from tier-2 success.
- **Phase 3 (terminal)** — both tiers exhausted. Return an explicit error matching the call contract; never a silent placeholder.

## Glue summary

| Atom | Role | What this technique adds beyond the atom |
| --- | --- | --- |
| `ai-call-with-mock-fallback` | shape | Generalization to non-AI calls; explicit tier-transition surfaces between tiers |
| `conditional-feature-flag-rollout` | gating | Reverting the chain becomes a config change, not a code ship |
| `circuit-breaker pitfall` | failure-mode warning | Mandates that tier-2 success is observable, not silent |

## Why "gated" matters

A fallback chain without a gate is hard to revert. If the chain itself is buggy (tier-2 has a different schema, the tier-transition log is missing a field), you have to ship code to disable it. The flag turns revert into a config change at human pace, not a release-cycle problem.

## Why "circuit-aware" matters

A fallback chain without circuit-breaker awareness silently absorbs failures — the upstream consumer believes everything works because tier-2 returned *something*. The `circuit-breaker-implementation-pitfall` knowledge entry codifies this exact failure mode: silent fallback masking. The technique inherits that constraint as a hard requirement: tier-2 success must surface as observably distinct from tier-1 success.

## Verification (draft)

- `verify.sh` (when added) re-asserts each `composes[].ref` exists.
- Sample integration: a 2-tier API call wrapped in a feature flag, with structured log lines `tier=primary` and `tier=fallback` on each respective path. A test that asserts the flag-off case bypasses the chain entirely.

## Known limitations

- Single-process scope — distributed circuit-breaker state across replicas needs a separate technique.
- The flag-rollout dependency assumes a feature-flag service exists; treat it as a precondition rather than as part of the technique.
- Synchronous request/response only — async fallback chains have different shapes (queue, retry, dead-letter), captured elsewhere.

## Provenance

- Authored 2026-04-25 in response to `_suggest_techniques.py` Bundle 2 signal — the same 3 atoms recur across `technique/ai/agent-fallback-ladder` (2/3), `technique/arch/feature-flag-killswitch-with-circuit-state` (2/3), and 3 paper proposed_builds in `paper/ai/llm-fallback-cost-displacement` and `paper/arch/feature-flag-flap-prevention-policies`.
- First technique authored as a direct response to the suggestion-scanner output. Treats the scanner as a discovery flow ahead of `/hub-technique-compose`.
- The technique generalizes one observation — `agent-fallback-ladder` works for AI calls and `feature-flag-killswitch` works for kill-switching, but neither captures the "fallback chain + flag + breaker awareness" intersection. This technique names that intersection.
