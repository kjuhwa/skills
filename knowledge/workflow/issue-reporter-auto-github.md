---
version: 0.1.0-draft
name: issue-reporter-auto-github
summary: Auto-report high-confidence failures as GitHub issues with stacks and recovery steps
category: workflow
confidence: medium
tags: [evolver, workflow, github, auto-issue, reference]
source_type: extracted-from-git
source_url: https://github.com/EvoMap/evolver.git
source_ref: main
source_commit: 22773782475cecf43dc9c1af264bf5f9cacc28bc
source_project: evolver
source_paths:
  - src/gep/issueReporter.js
imported_at: 2026-04-18T00:00:00Z
---

# Auto-escalate repeated failures to GitHub issues

When the agent fails repeatedly on the same class of error (streak of failures on a matching signature), open a GitHub issue instead of continuing to retry.

## Contents of the generated issue

- **Title** — short, classified ("Validation suite timing out after solidify").
- **Body** — error summary, stack trace, recent event context, reproduction hint.
- **Labels** — `bug`, `auto-reported`, plus a subsystem tag.
- **Deduplication key** — a hash of (error class + stack signature) used to avoid duplicate issues.

## Why this matters

Self-healing loops that never surface chronic failures become invisible to humans. The auto-issue turns "agent has been retrying for 3 days" into a visible ticket with context.

## Reuse notes

Guard the reporter behind strict confidence + cooldown rules so transient failures don't flood the issue tracker. Include the dedup key in the issue body so subsequent runs can comment on an existing issue instead of creating new ones.
