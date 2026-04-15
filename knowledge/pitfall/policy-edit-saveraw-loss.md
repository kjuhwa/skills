---
slug: policy-edit-saveraw-loss
category: pitfall
summary: Editing a common collection policy can silently drop individual `saveRaw`/interval settings if not re-applied
confidence: high
source:
  kind: project
  ref: lucida-measurement@bc4ed72
links:
  - non-metric-saveraw-null-rule
---

# Fact
Multiple regressions (#115701, #117606, #117625) hit the same shape: when a **common** collection-policy was updated, the propagation logic to **individual** policies dropped or corrupted `saveRaw` and measurement-interval fields. Symptoms included:
- Individual policies' interval not refreshing when the common policy changed interval.
- `saveRaw` flipping to `null` for METRIC types that had previously set it.
- When `resourceType` was unchanged, the interval-change branch skipped the saveRaw recomputation entirely.

# Evidence
- Commit `a185b93` (#115701) — "개별 수집 정책 수정 시 수집 주기 갱신 안되는 오류 수정"
- Commit `61b3a0a` — "non-Metric 지표는 saveRaw 값이 null로 유지될 수 있도록 수정"
- Commit `0c97e31` — "공통 수집 정책 수정 시 개별 설정 업데이트 오류 수정"
- Commit `7212a9b` — "resourceType이 동일해서 수집 주기가 변경되는 지표는 통계 저장 여부도 변경되도록 수정"

# How to apply
- Any change in common-policy update code must exercise **all four** branches: (resourceType changed / same) × (interval changed / same). The "same resourceType, same interval, changed something else" path is the historical bug hotbed.
- Always re-derive `saveRaw` per the non-METRIC null rule after any policy mutation, not only on resourceType changes.
- Tests for this path must assert field-by-field equality on individual policies after a common update — shape assertions miss the null-vs-false regression.

# Counter / Caveats
- This is load-bearing for data-retention SLOs; treat related PRs with extra review weight.
