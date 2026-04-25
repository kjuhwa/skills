---
version: 0.1.0-draft
name: transform-imperative-tasks-to-verifiable-goals
summary: Restate imperative user requests ("add validation", "fix the bug", "refactor X") as declarative goals with explicit verification criteria. Strong criteria let an agent loop to completion without repeated clarification.
category: engineering
tags: [task-framing, verification, agent-loops, goal-setting]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/forrestchang/andrej-karpathy-skills.git
source_ref: main
source_commit: c9a44ae835fa2f5765a697216692705761a53f40
source_project: andrej-karpathy-skills
source_path: skills/karpathy-guidelines/SKILL.md#4
imported_at: 2026-04-18T08:26:22Z
---

# Pattern — Transform imperative → verifiable

## Transforms
| Imperative | Verifiable goal |
|-----------|-----------------|
| "Add validation" | Write tests for invalid inputs; make them pass. |
| "Fix the bug" | Write a test that reproduces it; make it pass. |
| "Refactor X" | Existing test suite stays green before and after. |
| "Improve performance" | Define baseline; set target; benchmark before/after. |
| "Clean up the code" | List concrete measurable outcomes (e.g., cyclomatic complexity < N, no `any` types, zero lint warnings). |

## Why it matters
From Karpathy: *"LLMs are exceptionally good at looping until they meet specific goals... Don't tell it what to do, give it success criteria and watch it go."*

Weak criteria ("make it work", "improve it") force the loop to stop and ask constantly. Strong criteria let the loop self-terminate on success.

## Rule of thumb
If a teammate could verify your fix by running a single script, your criteria are strong. If they'd need to read your reasoning, they're weak.
