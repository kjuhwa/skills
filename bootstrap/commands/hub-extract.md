---
description: Scan the full project and extract reusable skills and knowledge as drafts
argument-hint: [<keyword>] [--session] [--only=skills|knowledge] [--from=project|diff|commit <sha>|range <A>..<B>] [--scope=all|src|docs] [--max=<n>] [--auto-split] [--min-confidence=high|medium|low] [--dry-run]
---

# /hub-extract $ARGUMENTS

Analyze the project (or a git diff/commit range) and classify each generalizable finding into:

- **Skills** — reusable, executable procedures → `.skills-draft/<category>/<slug>/`
- **Knowledge** — non-executable facts, decisions, pitfalls, arch notes → `.knowledge-draft/<category>/<slug>.md`

Default mode scans the **full project**. Use `--from` to narrow the source.


## Execution strategy (v2.6.1+)

Bulk scanning MUST be delegated to an `Explore` subagent. The main thread only synthesises drafts from the returned candidate list.

```
Agent(
  subagent_type="Explore",
  description="<short task name>",
  prompt="""
Scan the current project working directory — git tree + uncommitted changes + recent commits (last 7 days or --from range). Identify reusable skill and knowledge candidates from source files, commit messages, and README/docs. Same generalisation bar as hub-import: drop one-off code, business names, credentials. Prioritize patterns mentioned in user corrections or debugging workarounds discovered in the session.

Return a ranked list (top N per `--max-*` flag or sensible default) with: name, kind (skill|knowledge), category, 1-line description, source path(s), confidence. Drop anything project-specific or non-generalizable.
""",
)
```

After the subagent returns, read **only** the few MDs needed to write final drafts. Do **not** iterate `Read` across dozens of files in the main thread — it burns tokens, fragments history, and produces no better result than delegation. (v2.6.1 added this rule after a `/hub-import` run did 73 tool calls to scan one repo.)


## Dispatch (v2.6.0+)

- `--session` → delegate to the `/hub-extract-session` flow (session-only scope)

If none of these flags are present, run the main flow below.

## Keyword mode

If a bare positional argument is given (e.g. `/hub-extract kafka`):
- Focus **all** signal gathering, analysis, and classification on that keyword's domain.
- Add keyword-targeted searches before the general scan; weight keyword-matching findings higher.
- Still include tangentially related high-quality findings.

No keyword → full-project scan, no bias.

## Source modes (`--from`)

| Mode | Source | Default |
|------|--------|---------|
| `project` | Full project: git log, file tree, docs, manifests | **yes** |
| `diff` | `git diff HEAD` (uncommitted working changes) | |
| `commit <sha>` | Single commit's stat + message + diff | |
| `range <A>..<B>` | Each commit in the range as a separate chunk | |

## Preconditions

- Must be inside a project directory.
- Ensure `.skills-draft/` and `.knowledge-draft/` exist; add both to `.gitignore` if not already present.
- `~/.claude/skills-hub/registry.json` present (v2); migrate from v1 if needed (add `knowledge: {}`, bump version).

## Pipeline

### 1. Gather signals (in parallel)

- `git log --oneline -200` → recurring themes (doubles as knowledge source — decisions often live here).
- `git log --grep="decision\|because\|workaround\|FIXME\|gotcha"` → high-signal knowledge seeds.
- File tree summary: top directories, file counts by extension.
- `CLAUDE.md` / `AGENTS.md` / `README.md` / `docs/**` / `ADR/**` content — **primary knowledge source**.
- Package manifests: `package.json`, `pom.xml`, `requirements.txt`, `go.mod`, etc.
- Memory files in `~/.claude/projects/<project>/memory/` if present.

For `--from=diff|commit|range`: replace the above with the narrower git source, but still read project context files (CLAUDE.md, manifests) for classification context.

### 2. Deep analysis

Spawn `oh-my-claudecode:explore` with `thoroughness=very thorough` in **two tracks**:

- **Skill track**:
  - Custom patterns/abstractions that recur (≥3 occurrences).
  - Non-obvious setup steps (env vars, CLI flags, build tricks).
  - Recurring debugging workarounds ("workaround", "hack", "FIXME").
  - Integration glue (API adapters, auth flows, job scheduling) with generalizable shape.
- **Knowledge track**:
  - Architectural decisions with rationale (ADRs, design docs, commit messages explaining "why").
  - Pitfalls discovered (post-mortems, bug root causes, "don't do X because Y").
  - Domain invariants (business rules in validators, compliance constraints).
  - API/SDK contracts learned the hard way (undocumented behaviors, version quirks).

If `--only=skills`: skip knowledge track. If `--only=knowledge`: skip skill track.

### 3. Classify

For each candidate, emit:

```json
{
  "verdict": "skill" | "knowledge" | "both" | "drop",
  "reason": "...",
  "skill_draft": { "name": "...", "trigger": "...", "steps": [...] } | null,
  "knowledge_draft": { "category": "api|arch|pitfall|decision|domain", "summary": "...", "fact": "...", "evidence": [...] } | null,
  "confidence": "high" | "medium" | "low",
  "suggested_links": ["<skill-slug>"]
}
```

Rules:
- Executable procedure → **skill**
- Declarative / rationale / constraint → **knowledge**
- Procedure + rationale mixed → **both** (two files, bidirectional auto-link)
- One-off / context-only → **drop**
- Framework defaults ("Spring Boot uses @Controller") → **drop**
- `Counter / Caveats` section missing → confidence capped at `medium`
- Duplicate summary across chunks → downgrade to skill-only with link to existing knowledge
- Drop if confidence < `--min-confidence` (default `medium`)

### 4. Draft

- Skill: `.skills-draft/<category>/<slug>/SKILL.md` + `content.md` (`source_project`, `version: 0.1.0-draft`).
- Knowledge: `.knowledge-draft/<category>/<slug>.md` using standard knowledge template (frontmatter: `name`, `type: knowledge`, `category`, `confidence`, `source`, `linked_skills`, `tags`).
- For `both` verdicts: write both files with bidirectional `linked_skills` / `linked_knowledge`.

### 5. Preview

```
=== hub-extract dry-run ===
Project: <name>  HEAD: <sha>  Source: project (200 commits, 12 docs)

[x]  # | verdict    | slug                              | category | conf   | link
[x]  1 | knowledge  | idempotency-key-per-tenant        | api      | high   | -
[x]  2 | skill      | retry-with-jitter-backoff         | backend  | high   | -
[x]  3 | both       | event-replay-from-offset-store    | arch     | medium | (paired)
[ ]  4 | drop       | (spring @Transactional default)   | -        | -      | framework default

Select: [a]ll  [n]one  [i]nvert  numbers to toggle, or 'edit <#>'
Proceed? [y/N]
```

`--dry-run` stops here.

### 6. Persist

Approved entries only:
- Skill drafts → `.skills-draft/<category>/<slug>/`.
- Knowledge drafts → `.knowledge-draft/<category>/<slug>.md`.
- If a similar-named entry already exists, add `_DUPLICATE_CHECK.md`.

### 7. Report

```
Drafted:
  skills:     3 in .skills-draft/
  knowledge:  4 in .knowledge-draft/
Dropped:      7 (framework default / one-off / low-confidence)

Next:
  • Review drafts, then:
  • /hub-publish-skills     (skills only)
  • /hub-publish-knowledge  (knowledge only)
  • /hub-publish-all        (both at once)
```

## Rules

- Never touch files outside `.skills-draft/` and `.knowledge-draft/`.
- Sanitize: strip absolute paths, emails, tokens, internal hostnames, business names.
- `--max=<n>` caps per class. Otherwise **no limit**.
- Registry write is **not** performed here — drafts only.
- Never auto-commit or push.
- Slug: ascii-kebab. Non-ASCII → romanize or fallback.
- `--only=skills` behaves like the legacy skill-only extraction mode.
- `--only=knowledge` skips skill drafts entirely.
