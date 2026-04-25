---
version: 0.1.0-draft
name: exec-plan-format
summary: The ExecPlan format used in the openai-agents-python repo — a self-contained living spec for multi-step code changes.
category: llm-agents
confidence: medium
tags: [openai-agents, planning, execplan, codex, process]
source_type: extracted-from-git
source_url: https://github.com/openai/openai-agents-python.git
source_ref: main
source_commit: e80d2d2319eb300ac17ec496988b70246a5042d6
source_project: openai-agents-python
source_path: PLANS.md
imported_at: 2026-04-18T00:00:00Z
---

# ExecPlan Format (openai-agents-python)

The repo uses an ExecPlan format (documented in `PLANS.md`) for tracking multi-step code changes. It is designed to be:
- Self-contained (no external context needed to resume)
- Living (updated as work proceeds)
- Outcome-focused (describes observable behaviors, not just code edits)

## When Required

- Multi-step or multi-file changes
- New features, refactors
- Tasks expected to take more than ~1 hour
- Optional for trivial fixes if a reason is stated

## Required Sections

| Section | Purpose |
|---|---|
| `Purpose / Big Picture` | User-visible behavior after the change, how to observe it |
| `Progress` | Checkbox list with timestamps (living, updated as work proceeds) |
| `Surprises & Discoveries` | Unexpected behaviors, bugs, performance notes |
| `Decision Log` | Decisions with rationale and date |
| `Outcomes & Retrospective` | Summary of outcomes, gaps, lessons learned |
| `Context and Orientation` | Current state, key files, non-obvious terms |
| `Plan of Work` | Prose sequence of edits |
| `Concrete Steps` | Exact commands with expected outputs |
| `Validation and Acceptance` | Observable acceptance criteria + test commands |
| `Idempotence and Recovery` | How to retry/rollback safely |

## Formatting Rules

- Default: single fenced code block labeled `md`; no nested triple backticks inside
- Blank lines after headings; prose over bullet lists
- Checklists only in Progress section (mandatory there)

## Key Principles

- **Self-contained**: define every term; embed all needed repo knowledge
- **Beginner-friendly**: full paths, exact commands, expected outputs
- **Idempotent**: steps can be rerun without harm
- **Evidence-based**: acceptance includes exact test commands and expected results

## Source paths
- `PLANS.md` — full ExecPlan specification with skeleton template
