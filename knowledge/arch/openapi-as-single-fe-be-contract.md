---
version: 0.1.0-draft
name: openapi-as-single-fe-be-contract
description: Use OpenAPI 3.0 as the only intermediate artifact between planning and codegen; both FE and BE generators consume the same file
category: arch
source:
  kind: project
  ref: polestar10-auto-pipeline@b0f1c9d
confidence: high
linked_skills: []
tags: [openapi, contract, codegen, fe-be-alignment, interop]
---

**Fact:** When AI-generating both FE and BE, picking OpenAPI 3.0 as the shared intermediate (vs a custom JSON schema or parallel planning-doc reads) eliminates field drift: paths → HTTP mapping annotations on BE and endpoint constants on FE from the same `paths` entry; component schemas become both TS interfaces and Java DTOs; `required` → validation annotations on BE + FE validation; enums → Java enum + TS union. Zero learning cost because Swagger UI and tooling already exist.

**Why:** Custom intermediate formats forced re-teaching tools, UI, and contributors for no gain. OpenAPI is industry-standard, has ecosystem tooling (Swagger UI, codegen libs), and all fields map naturally to both sides.

**How to apply:**
- When designing FE/BE codegen, make OpenAPI the **only** artifact the generators read — don't let one side read the planning doc directly.
- Put the OpenAPI file under version control alongside the code so contract changes show up in PR diffs.
- Review OpenAPI as the human checkpoint between planning extraction and codegen; everything downstream is mechanical.
- Resist adding "planning-doc-specific hints" to the spec — if it can't live in standard OpenAPI, find another channel.

**Evidence:**
- Internal agent-architecture doc §3.2, §4.3 — full OpenAPI → Java + TS mapping table.
- Internal design-decisions doc §1 — rejection of custom-JSON alternative.
