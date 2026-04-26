---
version: 0.2.0-draft
name: swagger-spec-selective-two-pass-loading
description: "AI-consumer two-pass swagger loader — skim summaries, AI selects relevant operations, deep-load schemas only for selected ops. Token-cost displacement past spec-size crossover."
category: ai
tags:
  - swagger
  - openapi
  - ai-consumer
  - context-window
  - selective-loading
  - cost-displacement

composes:
  - kind: skill
    ref: ai/openapi-to-mcp-tag-grouping
    version: "*"
    role: skim-axis-grouping
    note: tag-based grouping is the natural skim axis for pass-1
  - kind: skill
    ref: workflow/swagger-ai-optimization
    version: "*"
    role: producer-side-precondition
    note: skim-quality depends on producer-side hygiene (clear tags, summaries)
  - kind: knowledge
    ref: arch/openapi-as-single-fe-be-contract
    version: "*"
    role: contract-premise
    note: spec is the load-bearing artifact; selective loading must not corrupt it
  - kind: knowledge
    ref: pitfall/ai-guess-mark-and-review-checklist
    version: "*"
    role: gap-guard-when-deep-load-skipped
    note: when AI omits an operation from pass-2, fallback must mark guesses, not silently fabricate

recipe:
  one_line: "AI consumer of large swagger spec: pass-1 loads paths+summaries+tags only, AI selects relevant ops for the task, pass-2 deep-loads full request/response schemas for selected ops only. Saves tokens past a per-spec crossover threshold."
  preconditions:
    - "Swagger / OpenAPI spec exceeds the AI agent's effective context window for full-load (typically 30K+ tokens)"
    - "Operations are tagged or otherwise discoverable by topic — pass-1 skim has signal"
    - "User task scopes naturally to a subset of operations (CRUD on one resource, one workflow), not the whole API"
    - "AI agent can issue two reads (or one read + one re-prompt) — not a single-shot tool"
  anti_conditions:
    - "Spec fits comfortably in context (≤ ~10K tokens) — full-load is simpler and avoids selection-error"
    - "User task spans the whole spec (e.g. generate a full SDK) — selective loading defeats the purpose"
    - "Operations lack tags / summaries — pass-1 skim has no signal to select on; falls back to full-load anyway"
    - "Single-shot tool with no re-prompt budget — two-pass needs a return trip"
  failure_modes:
    - signal: "Pass-1 skim is too lossy — AI selects wrong operations because summaries don't capture the task's verb"
      atom_ref: "skill:workflow/swagger-ai-optimization"
      remediation: "Producer-side hygiene: every operation needs a summary that names the verb + the resource. Skim must include operationId + tags + summary, not just path + method."
    - signal: "AI confidently invents schema fields for an operation it should have deep-loaded but skipped"
      atom_ref: "knowledge:pitfall/ai-guess-mark-and-review-checklist"
      remediation: "Pass-2 must mark every field NOT loaded as 'unknown — deep-load required'. Never let AI fabricate field names from the operation summary alone."
    - signal: "Selective loading saves tokens but doubles latency (two round trips); user task feels slower despite cheaper cost"
      atom_ref: "skill:ai/openapi-to-mcp-tag-grouping"
      remediation: "Pre-group by tag at load time so pass-1 returns a grouped index (one tag = one bucket); AI selects whole buckets in pass-2 — fewer round trips for multi-op tasks."
    - signal: "Cross-operation schema dependencies missed — pass-2 loads op A but op A's response refs op B's schema; B's schema wasn't loaded"
      atom_ref: "knowledge:arch/openapi-as-single-fe-be-contract"
      remediation: "Pass-2 must transitively expand $ref. Either load all schemas referenced by selected ops, or expose a third pass for ref-resolution."
  assembly_order:
    - phase: pass-1-skim
      uses: skim-axis-grouping
    - phase: ai-select
      uses: skim-axis-grouping
      branches:
        - condition: "selection covers ≥80% of estimated relevant ops"
          next: pass-2-deep-load
        - condition: "selection is uncertain (low confidence on what's relevant)"
          next: full-load-fallback
    - phase: pass-2-deep-load
      uses: producer-side-precondition
      branches:
        - condition: "selected ops reference schemas not in selection"
          next: ref-resolve
        - condition: "schemas self-contained"
          next: ai-task
    - phase: ref-resolve
      uses: contract-premise
    - phase: full-load-fallback
      uses: producer-side-precondition
    - phase: ai-task
      uses: gap-guard-when-deep-load-skipped

binding: loose

verify:
  - "every composes[].ref resolves on disk"
  - "the technique describes a TWO-PASS pattern (skim → select → deep-load) distinct from full-load"
  - "the technique includes a fallback for when selection confidence is low (full-load)"
---

# Swagger Spec Selective Two-Pass Loading (AI Consumer Side)

> The AI agent consuming a swagger spec faces the inverse of `technique/workflow/swagger-spec-ai-agent-hardening`. The producer optimizes the spec for AI; this technique optimizes how the AI **loads** the spec when it's still too large for context. Two passes — skim then select then deep — replace the naive single full-load.

<!-- references-section:begin -->
## Composes

**skill — `ai/openapi-to-mcp-tag-grouping`**  _(version: `*`)_
tag-based grouping is the natural skim axis for pass-1

**skill — `workflow/swagger-ai-optimization`**  _(version: `*`)_
skim-quality depends on producer-side hygiene (clear tags, summaries)

**knowledge — `arch/openapi-as-single-fe-be-contract`**  _(version: `*`)_
spec is the load-bearing artifact; selective loading must not corrupt it

**knowledge — `pitfall/ai-guess-mark-and-review-checklist`**  _(version: `*`)_
when AI omits an operation from pass-2, fallback must mark guesses, not silently fabricate

<!-- references-section:end -->

## When to use

- Swagger / OpenAPI spec is larger than the AI agent's effective context window (typical threshold: ~30K tokens, varies by model and surrounding context)
- The user task scopes naturally to a subset of operations — CRUD on one resource, one workflow, one tag's worth of endpoints
- Operations have meaningful tags + summaries (otherwise pass-1 skim has no selection signal)
- The agent runtime tolerates two reads (or one read plus a re-prompt round trip)

## When NOT to use

- Spec fits comfortably in context (~≤10K tokens) — full-load is simpler and avoids selection error
- The task spans the whole spec (full SDK generation, full coverage audit) — selective loading defeats the purpose
- Operations have no tags or summaries — pass-1 has no signal to select on; the technique degrades to full-load anyway
- Single-shot tool invocation with no re-prompt budget — two-pass requires a return trip

## Two-pass shape

```
   ┌──────────────────────────────────────────────────────────────┐
   │                                                              │
   │  pass-1 skim:    paths + methods + tags + summaries (only)   │
   │                  ↓                                            │
   │  AI selects:     "for the user's task, I need ops {A, B, C}"  │
   │                  ↓                                            │
   │  pass-2 deep:    full request/response schemas for {A, B, C}  │
   │                  ↓                                            │
   │  ref-resolve:    schemas referenced by {A, B, C}'s payloads   │
   │                  ↓                                            │
   │  AI task:        AI now has minimum-viable schema knowledge   │
   │                                                              │
   └──────────────────────────────────────────────────────────────┘

   Fallback:  if AI confidence on selection is low → skip to full-load.
              Better to spend tokens than to fabricate fields.
```

## Glue summary (net value added)

| Added element | Where |
|---|---|
| Pass-1 / pass-2 separation rule — never deep-load before selection | Loader contract |
| Selection-confidence threshold — low confidence triggers full-load fallback, not silent guess | AI side |
| `$ref` transitive resolution as an explicit third phase, not an afterthought | Schema dependency |
| Producer-side preconditions on tag + summary quality (without these, pass-1 has no signal) | Spec authoring |
| Gap-guard: any field NOT deep-loaded must be marked "unknown", never invented | Output contract |

The atomic skills cover **how to group operations** (`openapi-to-mcp-tag-grouping`) and **how to harden a spec** (`swagger-ai-optimization`). What this technique adds is the **two-pass loading discipline** — skim before select, select before deep-load, deep-load before task. The shape applies to any AI agent consuming any large API spec.

## Why two passes

Single-pass full-load wastes tokens proportional to spec size. For a 100K-token spec where the user needs 5 of 200 operations, full-load spends ~95% of the token budget on context the AI will never use. Two-pass loads ~5K tokens for the skim + ~5K for the selected schemas — a ~10× reduction.

The crossover point — where two-pass starts paying off vs full-load — depends on:
- Spec size (larger → bigger savings)
- Task scope (narrower → bigger savings)
- Selection accuracy (better → bigger savings)
- Round-trip latency (worse → smaller savings, may invert)

The technique requires that the crossover **exists** for the consumer's spec; measuring it is the role of the sibling paper.

## Why selection-confidence threshold

If the AI selects the wrong operations in pass-1, pass-2 loads useless schemas and the AI either fails the task or fabricates field names from the summaries. Both are worse than spending tokens on a full-load.

The technique mandates: when AI's confidence in its pass-1 selection is low (e.g. the user task description is vague, or no operations match obvious keywords), skip pass-2 and full-load instead. **Token cost is recoverable; fabricated field names corrupt downstream code.**

## Why `$ref` resolution is its own phase

OpenAPI schemas heavily use `$ref` to share component schemas across operations. Pass-2 might load `POST /orders` whose response references `#/components/schemas/Order`, which references `#/components/schemas/Customer`, which references `#/components/schemas/Address`. Without transitive expansion, the AI sees `$ref: "#/components/schemas/Order"` and has no idea what an Order looks like.

Two valid implementations:
1. **Eager**: pass-2 expands all `$ref` transitively before returning.
2. **Lazy with budget**: pass-2 returns refs unresolved; AI requests resolution per ref as needed, with a max-depth budget.

The technique requires one of the two — never silent ref-non-resolution.

## Cost-displacement crossover (testable)

The shape is the same as `paper/swagger-spec-hardening-size-crossover` and `paper/ai-swagger-gap-fill-confidence-distribution`: cost is fixed per pass, savings grow with spec size, crossover happens at some workload-conditional threshold. A sibling paper can measure the crossover for representative specs (PetStore, GitHub API, Stripe API) and compare two-pass tokens vs full-load tokens at varying selection accuracies.

## Known limitations (v0.2 draft)

- **Selection accuracy is the load-bearing assumption** — if AI picks wrong operations consistently, two-pass becomes worse than full-load. The technique assumes selection accuracy is "good enough" without specifying a threshold.
- **Round-trip latency cost is not modeled** — token savings are clear; wall-clock impact of an extra round trip is task-dependent and unmodeled here.
- **Operation-coupling failures** — when ops A and B are semantically coupled (e.g. one creates a resource the other consumes) and AI selects only A, pass-2 deep-loads only A's schema and the task fails. No mechanism to detect coupling at skim time.
- **Stateful selection across turns** — multi-turn conversations may need different operation slices per turn. The technique covers single-task selection only; multi-turn cache-and-extend is an extension.
- **Producer-side dependency** — if the producer hasn't applied `swagger-spec-ai-agent-hardening`, pass-1 skim has weak signal (cryptic operationIds, missing tags). Technique value drops sharply on un-hardened specs.

## Verification (draft)

```bash
#!/usr/bin/env bash
set -e
SKILLS_HUB="${SKILLS_HUB:-$HOME/.claude/skills-hub/remote}"
for ref in \
  "skills/ai/openapi-to-mcp-tag-grouping/SKILL.md" \
  "skills/workflow/swagger-ai-optimization/SKILL.md" \
  "knowledge/arch/openapi-as-single-fe-be-contract.md" \
  "knowledge/pitfall/ai-guess-mark-and-review-checklist.md"; do
  test -f "$SKILLS_HUB/$ref" || { echo "MISSING: $ref"; exit 1; }
done
echo "OK"
```

## Provenance

- Authored: 2026-04-26
- Counterpart to `technique/workflow/swagger-spec-ai-agent-hardening` (producer side). This technique is the **consumer side** of the same problem — given an AI-hardened (or unhardened) spec, how does the consumer load only what it needs.
- Sibling papers in the cost-displacement family:
  - `paper/workflow/swagger-spec-hardening-size-crossover` (producer-side hardening crossover)
  - `paper/workflow/ai-swagger-gap-fill-confidence-distribution` (producer-side gap-fill confidence)
  - This technique invites a third sibling: a paper measuring two-pass loading crossover on representative specs.
