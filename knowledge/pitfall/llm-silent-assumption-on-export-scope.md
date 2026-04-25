---
version: 0.1.0-draft
name: llm-silent-assumption-on-export-scope
summary: LLMs given "export user data" silently decide scope (all users), format (json/csv), file location, and fields — all of which have privacy and UX implications that should be surfaced first.
category: pitfall
tags: [llm-behavior, assumptions, scope-ambiguity, privacy]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/forrestchang/andrej-karpathy-skills.git
source_ref: main
source_commit: c9a44ae835fa2f5765a697216692705761a53f40
source_project: andrej-karpathy-skills
source_path: EXAMPLES.md#think-before-coding-example-1
imported_at: 2026-04-18T08:26:22Z
---

# Pitfall — Silent assumptions on "export user data"

## Symptom
Prompt: "Add a feature to export user data."

LLM produces `export_users(format='json')` that iterates `User.query.all()` and writes a file. Assumes:
- Scope: **all users** (no pagination, no filter).
- Delivery: local file write (not API response, not email job).
- Fields: hardcoded `id, email, name` without checking schema.
- Privacy: no redaction of sensitive fields.

## Why it's wrong
Each of those decisions is a user-facing choice with legal or UX consequences. Silent defaults bury them.

## Better behavior
Before coding, the LLM should ask:
1. Scope — all or filtered subset?
2. Delivery — file download, background job + email, or API?
3. Fields — which are acceptable given privacy constraints?
4. Volume — does this need pagination?

Then propose the **simplest** path (often: a paginated API endpoint) and let the user confirm before implementing file-based exports.

## Checklist to apply
- [ ] Scope is stated in the request.
- [ ] Delivery mechanism is stated.
- [ ] Field list is stated or explicitly defaulted with user sign-off.
- [ ] Sensitive-field treatment is stated.
