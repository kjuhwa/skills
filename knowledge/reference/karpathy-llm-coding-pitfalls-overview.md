---
version: 0.1.0-draft
name: karpathy-llm-coding-pitfalls-overview
summary: Reference overview of Andrej Karpathy's observations on recurring LLM coding pitfalls (wrong assumptions, overcomplication, unsolicited edits, weak goals) and the four-principle response.
category: reference
tags: [llm-behavior, karpathy, reference, coding-pitfalls]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/forrestchang/andrej-karpathy-skills.git
source_ref: main
source_commit: c9a44ae835fa2f5765a697216692705761a53f40
source_project: andrej-karpathy-skills
source_path: README.md
imported_at: 2026-04-18T08:26:22Z
---

# Reference — Karpathy's LLM coding pitfalls

Source: Andrej Karpathy's X post ([link](https://x.com/karpathy/status/2015883857489522876)) distilled in `forrestchang/andrej-karpathy-skills`.

## Paraphrased observations

> "The models make wrong assumptions on your behalf and just run along with them without checking. They don't manage their confusion, don't seek clarifications, don't surface inconsistencies, don't present tradeoffs, don't push back when they should."

> "They really like to overcomplicate code and APIs, bloat abstractions, don't clean up dead code... implement a bloated construction over 1000 lines when 100 would do."

> "They still sometimes change/remove comments and code they don't sufficiently understand as side effects, even if orthogonal to the task."

> "LLMs are exceptionally good at looping until they meet specific goals... Don't tell it what to do, give it success criteria and watch it go."

## Four-principle response
| Principle | Addresses |
|-----------|-----------|
| Think Before Coding | Wrong assumptions, hidden confusion, missing tradeoffs |
| Simplicity First | Overcomplication, bloated abstractions |
| Surgical Changes | Orthogonal edits, drive-by refactors |
| Goal-Driven Execution | Weak "make it work" criteria vs. verifiable success loops |

## Success signals that the principles are working
- Fewer unnecessary changes in diffs.
- Fewer rewrites due to overcomplication.
- Clarifying questions come before implementation, not after.
- Clean, minimal PRs with no drive-by refactoring.

## Tradeoff
These principles bias toward caution over speed. For trivial fixes (typos, one-liners), apply judgment — not every change needs the full rigor.

## See also (staged drafts)
- `engineering/think-before-coding-surface-assumptions` (skill)
- `engineering/simplicity-first-minimum-viable-code` (skill)
- `engineering/surgical-changes-only-touch-requested` (skill)
- `engineering/goal-driven-verifiable-success-criteria` (skill)
- `engineering/karpathy-llm-coding-guidelines` (umbrella skill)
- `pitfall/*` knowledge entries from EXAMPLES.md
