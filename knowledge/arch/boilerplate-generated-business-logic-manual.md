---
version: 0.1.0-draft
name: boilerplate-generated-business-logic-manual
description: Split AI codegen scope along the boilerplate/business-logic line — AI produces skeletons, humans fill domain rules
category: arch
source:
  kind: project
  ref: polestar10-auto-pipeline@b0f1c9d
confidence: high
linked_skills: []
tags: [codegen, hexagonal, scope, ai-automation, skeleton]
---

**Fact:** In hexagonal BE codegen, ~35% of the file volume is boilerplate (package layout, annotations, DTO fields, basic CRUD, mapper, Port/UseCase interfaces) and is reliably AI-generable. The remaining ~65% (business validation, complex queries, cross-domain calls, transaction boundaries, error scenarios, performance tuning) is not. Codegen scope should therefore stop at skeletons with `TODO:` / `// STUB:` markers.

**Why:** Observed in a multi-service BE automation POC: AI-guessed business logic cost more to fix than it saved because inferring domain rules from a screen-focused planning doc is unreliable. The 35/65 split held across multiple modules in that ecosystem.

**How to apply:**
- When scoping an AI codegen skill, don't promise "full feature" — promise "skeleton + stub".
- Put `TODO:` in the service method body, leave ports/adapters/DTOs/mappers fully generated.
- Report expected savings as "boilerplate hours saved", not "feature hours saved" (typically ~30% of total feature time, not 95%).
- Reject scope creep toward generating validation logic, query predicates, or auth checks from planning docs.

**Evidence:**
- Internal design-decisions doc §3, §7 — 60-70% manual residue acknowledged explicitly.
- Internal feasibility report §5.2 — table breaking out the 35/65 split per concern.
