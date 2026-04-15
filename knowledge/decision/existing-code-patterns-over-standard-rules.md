---
name: existing-code-patterns-over-standard-rules
description: When generating into an established repo, mirror the repo's existing style first; apply the written standard only when the repo is empty or silent
category: decision
source:
  kind: project
  ref: polestar10-auto-pipeline@b0f1c9d
confidence: high
linked_skills: []
tags: [codegen, style-matching, convention, rulebook, hexagonal]
---

**Fact:** Codegen that enforces a single "standard architecture" (e.g. hexagonal from a reference module) on every target repo creates churn in repos that already adopted a different style (traditional layered, mixed). The working rule is **existing code first, standard rulebook second**. Only truly non-negotiable invariants (e.g. HTTP-method convention, response envelope) are enforced unconditionally.

**Why:** Applying the canonical hexagonal rulebook to a target repo with a layered architecture produced dozens of unnecessary Port interfaces that reviewers rejected, erasing the automation gain. Contributors accept AI-generated code only when it looks like the code next to it.

**How to apply:**
- Step 1 of any codegen skill: scan the target package for existing controller/service/DTO samples; extract naming, layering, annotation style.
- Step 2: generate in that style; fall back to the rulebook only for layers the repo doesn't already have.
- Keep a short list of **unconditional** invariants (project-wide contracts like response envelope, auth annotation) separate from stylistic rules.
- Treat the rulebook as a "new-repo default", not a "refactoring spec" — don't rewrite existing code to match it.

**Evidence:**
- Internal design-decisions doc §5 — forecast-as-standard failed across other domains; "existing pattern first" adopted.
- Project CLAUDE.md core principles — codified as a core principle.
