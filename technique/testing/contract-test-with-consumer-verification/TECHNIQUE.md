---
version: 0.1.0-draft
name: contract-test-with-consumer-verification
description: "Contract test with consumer verification: producer commits, all consumers verify against shared schema, quorum decides"
category: testing
tags:
  - contract-test
  - consumer-driven
  - schema-validation
  - quorum-vote
  - api-compatibility

composes:
  - kind: skill
    ref: safety/interface-contract-validation
    version: "*"
    role: schema-validation-shape
  - kind: skill
    ref: testing/tdd
    version: "*"
    role: test-discipline
  - kind: skill
    ref: workflow/idempotency-data-simulation
    version: "*"
    role: replay-safety-pattern

binding: loose

verify:
  - "every composes[].ref is installed in the hub"
  - "consumer verifications run independently; quorum (not unanimity) decides compatibility"
---

# Contract Test with Consumer Verification (Quorum)

> A producer publishes a candidate change. Each consumer runs its own contract test against the candidate independently. Compatibility is decided by quorum vote (e.g. ≥ 2/3 consumers pass) rather than unanimity. Distinct from consumer-driven contracts (Pact: usually require all consumers pass) and from producer-driven (consumers absorb breakage).

<!-- references-section:begin -->
## Composes

**skill — `safety/interface-contract-validation`**  _(version: `*`)_
schema-validation-shape

**skill — `testing/tdd`**  _(version: `*`)_
test-discipline

**skill — `workflow/idempotency-data-simulation`**  _(version: `*`)_
replay-safety-pattern

<!-- references-section:end -->

## When to use

- Many consumers depend on one producer; some may be stale or abandoned
- Unanimity is unrealistic — at least one consumer always lags
- Compatibility decision needs to be data-driven, not "ship and pray"

## When NOT to use

- Few consumers (3 or fewer) — unanimity is practical
- Compliance requires zero breaking changes (all consumers must pass)
- Consumers cannot run their own tests in CI (no ownership of consumer-side instrumentation)

## Shape

```
[producer candidate change]
         │
         ▼
[broadcast to all known consumers]
         │
   ┌─────┼─────┬─────┐
   ▼     ▼     ▼     ▼
consumer A  B   C   D
(test)   (test)(test)(test)
   │     │     │     │
   PASS  PASS  PASS  FAIL
   │     │     │     │
   └─────┴─────┴─────┘
         │
         ▼
[tally: 3/4 pass → quorum (≥ 2/3) → MERGE candidate]
         │
         ▼
[notify consumer D: incompatibility, deadline N days]
```

## Glue summary (net value added)

| Added element | Where |
|---|---|
| Quorum threshold defined per producer (e.g. 2/3, 3/4) — not universal | Producer config |
| Failing consumers get explicit notification + deadline, not silent drop | Post-vote |
| Schema is shared, not duplicated per consumer | Producer-owned schema |
| Idempotent test re-runs — flaky network does not skew vote | Per consumer |

## Known limitations

- Off-by-one in quorum math (see paper-citation: pitfall pattern)
- Stale consumers can drag the majority backward unless retired
- Consumer ownership of tests requires organizational discipline

## Provenance

- Authored 2026-04-25, pilot in 10-technique batch
- Quorum reasoning shared with #7 (multi-peer-quorum-decision-loop)
