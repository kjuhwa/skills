---
version: 0.1.0-draft
name: serial-pipeline-failure-compounding
description: N-stage serial AI pipeline success = product of per-stage success rates; prefer developer-invoked skills at each boundary
category: pitfall
source:
  kind: project
  ref: polestar10-auto-pipeline@b0f1c9d
confidence: high
linked_skills: []
tags: [pipeline, reliability, ai-automation, skill-boundary, review-gate]
---

**Fact:** A serial AI pipeline `plan → design → FE → BE` with 80% per-stage success has ~41% end-to-end success (0.8⁴). Failure mode is "garbage in, garbage out": low-quality planning output silently pollutes all downstream artifacts with no human checkpoint. Developer-invoked skills at each boundary (human runs an extraction skill, reviews, then runs codegen) isolate failures and keep error recovery local.

**Why:** A prior multi-service POC produced planning docs with missing module names, wrong component references, naming inconsistencies — defects that only surfaced at codegen time. Rebuilding from stage 1 was much costlier than fixing at the skill boundary.

**How to apply:**
- Resist "end-to-end pipeline" framing when pitching AI automation; frame as "a toolkit of skills the developer chains".
- Insert an explicit human review gate after any stage whose output feeds the next stage's prompt (an API contract spec between planning and codegen is the canonical checkpoint).
- When estimating ROI, multiply per-stage success rates — don't sum per-stage savings.
- Prefer idempotent, re-runnable skills over stateful pipeline steps so partial failure doesn't force full rerun.

**Evidence:**
- Internal feasibility report §5.1 — explicit 0.8⁴ = 0.41 calculation.
- Internal agent-architecture doc §6.2 — "Skills run independently — avoid serial pipeline dependency, isolate failures".
