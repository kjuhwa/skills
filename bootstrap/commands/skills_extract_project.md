---
description: Scan the entire project and draft BOTH executable skills and non-executable knowledge (facts, decisions, pitfalls, arch notes)
argument-hint: [--scope=all|src|docs] [--max=<n>] [--auto-split] [--only skill|knowledge] [--dry-run] [--min-confidence high|medium|low]
---

# /skills_extract_project $ARGUMENTS

Full-project counterpart of `/skills_extract_knowledge`. Scans the whole project (same signal set as `/skills_extract`) and classifies each generalizable finding into:

- **Skills** — reusable *executable* procedures → `.skills-draft/<category>/<slug>/`
- **Knowledge** — *non-executable* facts, decisions, pitfalls, arch notes → `.knowledge-draft/<category>/<slug>.md`

Use this at project wrap-up (or mid-project review) to capture both the "how to do" and the "what is true / why we chose this".

## Preconditions

- Must be inside a project directory.
- Ensure `.skills-draft/` and `.knowledge-draft/` exist; add both to `.gitignore`.
- `~/.claude/skills-hub/registry.json` present (v2); migrate from v1 if needed (same rules as `/skills_extract_knowledge`).
- Ensure `~/.claude/skills-hub/knowledge/{api,arch,pitfall,decision,domain}/` exist for eventual promotion.

## Pipeline

### 1. Gather signals (in parallel)

- `git log --oneline -200` → recurring themes in commit messages (doubles as knowledge source — decisions often live here).
- `git log --grep="decision\|because\|workaround\|FIXME\|gotcha"` → high-signal knowledge seeds.
- File tree summary: top directories, file counts by extension.
- `CLAUDE.md` / `AGENTS.md` / `README.md` / `docs/**` / `ADR/**` content if present — **primary knowledge source**.
- Package manifests: `package.json`, `pom.xml`, `requirements.txt`, `go.mod`, etc.
- Memory files in `~/.claude/projects/<project>/memory/` if present.

### 2. Delegate deep analysis

- Spawn `oh-my-claudecode:explore` with `thoroughness=very thorough` to find, **in two tracks**:
  - **Skill track** (same as `/skills_extract`):
    - Custom patterns/abstractions that recur (≥3 occurrences).
    - Non-obvious setup steps (env vars, CLI flags, build tricks).
    - Recurring debugging workarounds (search for "workaround", "hack", "FIXME").
    - Integration glue (API adapters, auth flows, job scheduling) with generalizable shape.
  - **Knowledge track** (new):
    - Architectural decisions with rationale (ADRs, design docs, commit messages explaining "why").
    - Pitfalls discovered (post-mortems, bug root causes, "don't do X because Y" comments).
    - Domain invariants (business rules hard-coded in validators, tax/compliance constraints).
    - API / SDK contracts learned the hard way (undocumented behaviors, version-specific quirks).

### 3. Classify

For each candidate, emit the same JSON schema as `/skills_extract_knowledge`:

```json
{
  "verdict": "skill" | "knowledge" | "both" | "drop",
  "reason": "...",
  "skill_draft":    { "name": "...", "trigger": "...", "steps": [...] } | null,
  "knowledge_draft":{ "category": "api|arch|pitfall|decision|domain",
                      "summary": "...", "fact": "...", "evidence": [...] } | null,
  "confidence": "high" | "medium" | "low",
  "suggested_links": ["<skill-slug>"]
}
```

Classification rules (same as `/skills_extract_knowledge`):
- Executable procedure → `skill`
- Declarative / rationale / constraint → `knowledge`
- Procedure + rationale mixed → `both` (bidirectional auto-link; `suggested_links` stays empty for same-chunk pairs).
- One-off / context-only → `drop`
- Duplicate summary across chunks → downgrade to `skill only` with link to existing knowledge.
- `Counter / Caveats` 근거가 없으면 confidence 최대 `medium`.

Additional project-scope rule:
- Findings that only describe **framework defaults** (e.g. "Spring Boot uses @Controller") → `drop`. Only generalizable shapes/decisions/pitfalls that the project **actively learned or chose** survive.

### 4. Filter & draft

Per `skills-hub` extract heuristics:
- **Keep**: generalizable shapes, domain-agnostic patterns, reusable workflows, decisions with rationale.
- **Drop**: business names, credentials, one-off fixes, framework defaults, project-specific glue without reusable shape.

Draft locations:
- Skill: `.skills-draft/<category>/<slug>/SKILL.md` + `content.md` (same as `/skills_extract`; `source_project = <project name>`, `version: 0.1.0-draft`).
- Knowledge: `.knowledge-draft/<category>/<slug>.md` using the standard knowledge frontmatter (§Knowledge template in `/skills_extract_knowledge`). `source.kind = project`, `source.ref = <project name>@<HEAD sha>`.

### 5. Preview

```
=== skills_extract_project dry-run ===
Project: <name>  HEAD: <sha>  Signals: 200 commits, 12 docs, 4 manifests

[x]  # | verdict    | slug                              | category | conf   | link
[x]  1 | knowledge  | idempotency-key-per-tenant        | api      | high   | -
[x]  2 | skill      | retry-with-jitter-backoff         | backend  | high   | -
[x]  3 | both       | event-replay-from-offset-store    | arch     | medium | (paired)
[x]  4 | knowledge  | feature-flag-sunset-policy        | decision | high   | -
[ ]  5 | drop       | (spring @Transactional default)   | -        | -      | framework default
...

Select: [a]ll  [n]one  [i]nvert  numbers to toggle, or 'edit <#>'
Proceed? [y/N]
```

`--dry-run` → preview only, no writes.

### 6. Persist

Approved entries only:
- Skill drafts → `.skills-draft/<category>/<slug>/`.
- Knowledge drafts → `.knowledge-draft/<category>/<slug>.md`.
- **No registry write yet** — drafts are local; `/skills_publish` handles skills and a future `/knowledge_publish` will handle knowledge. For immediate personal use, user can move knowledge drafts to `~/.claude/skills-hub/knowledge/<category>/` and run `/knowledge_list` to validate.

### 7. Report

```
Drafted:
  skills:     3 in .skills-draft/
  knowledge:  4 in .knowledge-draft/
Dropped:      7 (framework default / one-off / low-confidence)

Review:
  • .skills-draft/**/SKILL.md         ← edit → /skills_publish
  • .knowledge-draft/**.md            ← edit → move to ~/.claude/skills-hub/knowledge/<cat>/
                                        or wait for /knowledge_publish (v2)

Total project signals processed: 200 commits, 12 docs, 4 manifests → 14 candidates, 7 accepted.
```

## Rules

- Never touch files outside `.skills-draft/` and `.knowledge-draft/`.
- Sanitize: strip absolute paths, emails, tokens, internal hostnames, business names.
- Cap at `--max=<n>` per-class drafts (default 10 skills + 10 knowledge) to keep review tractable.
- If a similar-named skill or knowledge already exists (local or remote), add `_DUPLICATE_CHECK.md` note in the draft folder/file.
- `--only skill` → behave like `/skills_extract` (ignore knowledge track).
- `--only knowledge` → skip skill drafts entirely.
- Registry write is **not** performed here; moving knowledge into place is a separate explicit step.
