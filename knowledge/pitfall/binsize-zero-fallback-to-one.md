---
category: pitfall
summary: Substitute binSize=1 whenever the computed interval is 0 in MongoDB time-bucket aggregation
source:
  kind: project
  ref: lucida-performance@0536094
confidence: high
---

# binSize=0 must be coerced to 1

## Fact

`MeasurementMetricRepositoryImpl` coerces `this.interval == 0 ? 1 : this.interval` when appending `binSize` to the aggregation pipeline (two call sites).

## Why

`$bucketAuto` / custom bucket stages divide timestamps by `binSize`. A zero binSize triggers a MongoDB evaluation error (division by zero) or produces an empty result set depending on driver version. Interval can land at 0 when the caller passes an unusual mode combination (e.g. very small range with `intervalMode=auto`) or during Jenkins-triggered smoke runs.

## How to apply

- Any new aggregation that uses a computed interval must apply the same guard: `interval <= 0 ? 1 : interval`.
- Preferable: centralise the guard in a single `resolveBinSize(interval)` helper rather than repeating `== 0 ? 1 :`.
- Do not propagate raw `intervalMode` downstream without first resolving it to a positive millisecond value.
- When you see a binSize of `0` in logs or payloads, that is **always** a caller bug — fix the caller, don't widen the guard.

## Evidence

- `dao/MeasurementMetricRepositoryImpl.java` (two call sites, both use the ternary).
- Commit `3ad4cf9`: "Jenkins에서 SonarQube 수동 실행을 위해 스크립트 개선 binSize 0이면 1로 되게 수정".
