---
version: 0.1.0-draft
name: pre-push-discipline-test-lint-typecheck
summary: OpenSRE's CLAUDE.md / AGENTS.md mandate "before push" gates — clean working tree, then test-cov, lint, typecheck — and a self-improvement loop that captures lessons in tasks/lessons.md after every correction. Useful guardrail pattern for AI-assisted dev workflows.
category: workflow
tags: [pre-push, discipline, ai-workflow, self-improvement]
source_type: extracted-from-git
source_url: https://github.com/Tracer-Cloud/opensre.git
source_ref: main
source_commit: fb5ba0a1b4ef511d16c56a80f1f126b1f581d724
source_project: opensre
source_path: AGENTS.md
imported_at: 2026-04-18T00:00:00Z
confidence: medium
---

# Pre-Push Discipline + Self-Improvement Loop

## The pattern
OpenSRE's `AGENTS.md` lays out a six-step workflow orchestration that's worth borrowing for any AI-assisted codebase:

1. **Plan Mode Default** — non-trivial tasks (3+ steps) start with a plan. Re-plan immediately if something diverges.
2. **Subagent Strategy** — offload research and parallel analysis to subagents to keep main context clean.
3. **Self-Improvement Loop** — after ANY correction from the user, append the pattern to `tasks/lessons.md`. Review at session start.
4. **Verification Before Done** — never mark complete without proving it works. Run `make test-cov`, `make lint`, `make typecheck`.
5. **Demand Elegance (Balanced)** — for non-trivial changes, pause and ask "is there a more elegant way?". Skip for trivial fixes.
6. **Autonomous Bug Fixing** — given a bug report, just fix it. Don't ask for hand-holding.

Plus a four-line "Before Push" checklist:
1. Clean working tree.
2. `make test-cov`.
3. `make lint`.
4. `make typecheck`.

## Why this works
- Explicit pre-push commands are easier for an AI agent to follow than implicit "make sure tests pass".
- The lessons file becomes a project-specific lint of past mistakes.
- "Plan first, verify after" bookends the work without micromanaging the middle.

## How OpenSRE enforces it
- Makefile targets `lint`, `typecheck`, `test-cov`, `check`.
- `pyproject.toml` declares ruff config (E, F, I, S) and per-file-ignores so lint passes consistently.
- Coverage data file moved into `.pytest_cache/` to keep `git status` clean (helps with rule 1).
- `tasks/todo.md` and `tasks/lessons.md` referenced as canonical locations.

## Generalizable
Any team using Claude Code, Cursor, or similar AI dev tools can adopt this nearly verbatim. The key insight is that the workflow document is itself an asset — the AI re-reads it every session and the rules compound.
