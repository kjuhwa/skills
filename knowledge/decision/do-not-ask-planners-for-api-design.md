---
version: 0.1.0-draft
name: do-not-ask-planners-for-api-design
description: Product planners own screens and UX, not endpoint shapes — push API design to AI extraction + developer review instead of template-driven planner input
category: decision
source:
  kind: project
  ref: polestar10-auto-pipeline@b0f1c9d
confidence: high
linked_skills: []
tags: [planning-doc, api-design, role-boundary, ai-extraction, review-gate]
---

**Fact:** A natural impulse when planning docs lack API detail is to extend the planning template with an "API section" (endpoints, required fields, error codes, permissions). This fails: planners are domain/UX experts, not API designers. Forcing them to fill an API template produces either empty sections or wrong designs that then have to be undone. The working split is:
- **Planner**: screen spec as-is, optionally 3 lines of hints (data source, CRUD type, permission group).
- **AI**: extract OpenAPI draft from screen content, mark all guesses explicitly.
- **Developer**: 10–15 minute review — confirm URL, required fields, error codes, add permission IDs.

**Why:** Asking a non-API-designer to author API specs introduces a new failure mode (wrong designs authored confidently) that's harder to detect than missing fields. AI-guessed drafts with marked uncertainty give the reviewer a precise, small list to act on.

**How to apply:**
- When an AI ingestion pipeline is missing structured input, resist the urge to push the burden upstream to the author.
- Instead: have AI infer + mark + hand the marked artifact to the role that actually owns the answer.
- The "3 lines of hints" optional addition is cheap and meaningfully improves AI accuracy on request parameters and CRUD classification — add it as optional, never required.
- Never let an AI-generated spec skip the developer review gate, even when confidence looks high.

**Evidence:**
- Internal planning-doc-requirements doc §2 (A/B/C analysis), §3 (adopted B+C).
