---
version: 0.1.0-draft
name: ai-guess-mark-and-review-checklist
description: When AI fills gaps the source doc doesn't specify, annotate the guess inline and output a review checklist alongside the artifact
category: pitfall
source:
  kind: project
  ref: polestar10-auto-pipeline@b0f1c9d
confidence: high
linked_skills: []
tags: [ai-inference, uncertainty, review, openapi-extraction, transparency]
---

**Fact:** Screen-focused planning docs lack endpoint URLs, required-field markers, error codes, pagination, permissions, and API versions. AI has to guess these to produce a working OpenAPI spec. If guesses are silent, reviewers miss them and downstream code inherits the wrong contract. Mitigation: tag every AI-inferred field in the output (e.g. `# ⚠️ AI guess:` YAML comment, or a `WARN` log line) **and** emit a companion review checklist that enumerates exactly what to verify.

**Why:** In a prior POC, silent guesses (treating a context-carried parameter as required, inventing endpoint paths from feature names, inferring 404 cases) became frozen contracts that were expensive to undo after code generation consumed them. Explicit uncertainty makes the review fast and correct.

**How to apply:**
- In any LLM-generated spec/config, distinguish **sourced** fields (directly from input) from **inferred** fields (AI guess) with an inline marker the reader can't miss.
- Emit a second artifact — a markdown checklist keyed to the marked items — so the reviewer has a working list, not a whole spec to re-read.
- Structure the prompt to output "guess + reason + confidence" per inference so the reviewer judges plausibility quickly.
- Do NOT try to push the planning author to fill the gaps — domain experts don't design APIs. AI-inference + dev-review is the realistic split.

**Evidence:**
- Internal planning-doc-requirements doc §1 (13-row known-gap table), §4 (review-checklist generation).
- Prior POC feedback — missing module/page/file names caused downstream defects.
