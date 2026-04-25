# skills-hub

> **A 4-tier knowledge stack for Claude Code.** Atoms (skills + knowledge) compose into **techniques** (recipes that reference, never copy) and feed **papers** (hypothesis-driven analyses that close the loop with experiments). All schema-validated, all installable with one slash command.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Bootstrap](https://img.shields.io/github/v/tag/kjuhwa/skills-hub?filter=bootstrap/v*&label=bootstrap&color=purple)](https://github.com/kjuhwa/skills-hub/tags)
[![Techniques](https://img.shields.io/badge/techniques-17-teal)](./technique)
[![Papers](https://img.shields.io/badge/papers-15-indigo)](./paper)
[![Skills](https://img.shields.io/badge/skills-1105-blue)](./index.json)
[![Knowledge](https://img.shields.io/badge/knowledge-894-green)](./knowledge)
[![Examples](https://img.shields.io/badge/examples-29-orange)](./example)

---

## The Four Layers

The hub is built around two axes: **enforcement** (atoms → techniques) and **exploration** (papers → outcomes). Each layer has a distinct job.

| Layer | What it is | Job | Schema gate |
|---|---|---|---|
| **`skill/`** | Atomic, executable procedure (recipe with triggers) | "do X" | frontmatter validated |
| **`knowledge/`** | Atomic, non-executable fact / decision / pitfall | "X is true because…" | frontmatter validated |
| **`technique/`** | Composition recipe — references 2+ atoms, never copies | "this is the *shape* of how X is done" | `composes[]` resolves; no technique-nesting (v0) |
| **`paper/`** | Hypothesis-driven argument with `premise.if/then`, `examines[]`, `experiments[]`, `outcomes[]` | "is X actually true? what happens if…?" | structure only (premise non-empty, ≥2 perspectives, refs resolve, completed-experiment fields consistent) |

**The exploration loop** (paper layer): a `hypothesis` paper transitions `draft → implemented` only when at least one `experiments[]` entry completes with a non-null `result` and `supports_premise`. If the result refines or refutes the premise, the paper rewrites itself and emits a new corpus entry via `outcomes[]`. Empty experiments + empty outcomes across ≥5 papers triggers **layer retraction** — the schema's own self-corrective gate.

**Why techniques exist**: `/hub-merge` absorbs entries (good for true duplicates). `technique/` *references* atoms, so each atom retains independent versioning and can evolve under its compose call. A technique is never the canonical home for the procedure; it's the canonical home for the *pattern of combination*.

---

## Quick Start

```bash
# Linux / macOS / Git Bash
git clone https://github.com/kjuhwa/skills-hub.git ~/.claude/skills-hub/remote
bash ~/.claude/skills-hub/remote/bootstrap/install.sh

# PowerShell (Windows)
git clone https://github.com/kjuhwa/skills-hub.git $HOME\.claude\skills-hub\remote
powershell -ExecutionPolicy Bypass -File $HOME\.claude\skills-hub\remote\bootstrap\install.ps1
```

The installer wires up slash commands, registers git hooks, and seeds `~/.claude/`. Restart Claude Code, then in any session:

```
/hub-find "<query>"           ranked corpus search (KO↔EN synonyms)
/hub-install <name>           pull a skill / knowledge entry locally
/hub-paper-list               browse hypothesis-driven papers
/hub-technique-list           browse composition recipes
/hub-extract                  mine the current project for new patterns
/hub-publish --pr             ship drafts back as a PR
```

`git pull` alone keeps you current — the post-merge hook re-runs `install.sh` whenever `bootstrap/` changes.

---

## Repository Layout

```
paper/                        # hypothesis-driven analyses (the exploration axis)
  <category>/<slug>/
    PAPER.md                  # premise + examines + perspectives + experiments + outcomes
technique/                    # composition recipes (the enforcement axis)
  <category>/<slug>/
    TECHNIQUE.md              # composes[] references — no copies, no nesting (v0)
    verify.sh                 # optional sanity check
skills/                       # atomic executable procedures
  <category>/<name>/
    SKILL.md + content.md
knowledge/                    # atomic non-executable facts
  <category>/<slug>.md
example/                      # ready-to-install reference projects (29)
bootstrap/
  commands/                   # slash-command sources
  tools/                      # python helpers (lint, indexers, injectors)
  install.{sh,ps1}            # installers
docs/rfc/                     # paper-schema-draft.md, technique-schema-draft.md
CATEGORIES.md                 # canonical category list
index.json                    # flat catalog (auto-rebuilt by post-* git hooks)
registry.json                 # installed-entry manifest
```

After installation, `~/.claude/skills-hub/` mirrors `tools/`, `bin/`, generated `indexes/`, and any installed entries.

---

## Command Reference

### Paper layer (the exploration axis)

| Command | Purpose |
|---|---|
| `/hub-paper-compose <slug>` | Authoring flow — premise → examines → perspectives → proposed_builds → planned experiments. Auto-verifies. |
| `/hub-paper-verify <slug> \| --all` | Schema §6 gate — structure only, never validates claim substance |
| `/hub-paper-list [--status/--type/--category]` | Status-grouped table; emits the §11 retraction signal at scale |
| `/hub-paper-show <slug>` | Body + inline-expanded `examines[]`/`requires[]`; experiments rendered as a status table |
| `/hub-find --kind paper <query>` | Search papers via the main `/hub-find` |

### Technique layer

| Command | Purpose |
|---|---|
| `/hub-technique-compose <slug>` | Pick atoms, assign roles, generate `TECHNIQUE.md`, auto-verify |
| `/hub-technique-verify <slug> \| --all` | Schema §9 gate — composes refs exist, no nesting |
| `/hub-technique-list [--drafts-only \| --installed-only]` | Local drafts + installed |
| `/hub-technique-show <slug>` | Body + expanded `composes[]` with inline atom descriptions |

### Atomic layers (skills + knowledge)

| Command | Purpose |
|---|---|
| `/hub-find "<query>"` | Ranked search (180+ KO↔EN synonyms; scores name/description/tags/triggers) |
| `/hub-suggest "<task>"` | Pre-implementation discovery — interprets intent, offers install/reference |
| `/hub-install <name> [@version]` | Install one entry (`--all` for bulk, `--example` for demo projects) |
| `/hub-list` | What's installed (`--kind skills\|knowledge\|techniques\|papers\|examples`) |
| `/hub-show <name>` | Display full content of an installed entry |
| `/hub-extract [keyword]` | Mine the current project; `--session` narrows to current session |
| `/hub-publish [--only ...] [--pr]` | Review drafts → branch + PR (one PR carries skills + knowledge + technique + paper drafts) |
| `/hub-sync` | Pull remote + refresh installs + rebuild indexes |
| `/hub-doctor` | Diagnose & repair local install |

### Maintenance

`/hub-merge`, `/hub-split`, `/hub-refactor`, `/hub-condense`, `/hub-cleanup` — all read-only on remote, produce drafts that ship through the normal publish flow.

`/hub-commands-update [--version=x.y.z]` rolls the slash-commands forward or back to a tagged release. `/hub-commands-publish --bump=patch --pr` publishes local edits with a `bootstrap/v*` tag.

---

## Authoring

### Skill (`skills/<category>/<slug>/SKILL.md`)

```yaml
---
name: kebab-case-name
description: One specific sentence with trigger keywords.
category: backend           # see CATEGORIES.md
tags: [observability, otel]
triggers: [OpenTelemetry, OTEL, span]
version: 1.0.0
---
```
Body: Problem → Pattern → Example → When to use → Pitfalls.

### Knowledge (`knowledge/<category>/<slug>.md`)

Categories: `api`, `arch`, `decision`, `domain`, `pitfall`, `workflow`. Frontmatter carries `summary`, `confidence`, `linked_skills`, `source.{kind,ref}`. Body: Fact → Context/Why → Evidence → Applies when → Counter/Caveats.

### Technique (`technique/<category>/<slug>/TECHNIQUE.md`)

```yaml
composes:
  - kind: skill
    ref: workflow/safe-bulk-pr-publishing
    role: orchestrator        # short label (≤30 chars)
    note: optional long-form prose for the body section
    version: "^1.0.0"
binding: loose                # loose (range) | pinned (exact)
```
Schema: `docs/rfc/technique-schema-draft.md`. Min 2 atoms; technique-to-technique nesting is forbidden in v0.

### Paper (`paper/<category>/<slug>/PAPER.md`)

```yaml
type: hypothesis | survey | position
premise:
  if: <condition>
  then: <predicted outcome>
examines:
  - kind: skill | knowledge | technique | paper   # paper added in v0.2.1
    ref: <kind-root-relative path>
    role: <short label>
    note: <optional prose>
perspectives:                                     # ≥2 required
  - { name: ..., summary: ... }
proposed_builds:
  - slug: ...
    requires: [...]                               # non-triviality gate
experiments:
  - { name, hypothesis, method, status, result, supports_premise, observed_at, built_as }
outcomes: [...]
status: draft | reviewed | implemented | retracted
```
Schema: `docs/rfc/paper-schema-draft.md`. Verification is **structure only** — claim correctness is reviewer judgment, never a lint check.

`role` stays as a compact label; long prose goes into the optional `note:` field. Both `_inject_references_section.py` (body section generator) and `_compress_role.py` (role/note splitter) are idempotent and run from `bootstrap/tools/`.

---

## Versioning

| Tag scheme | Example |
|---|---|
| Per-skill | `skills/<name>/v<semver>` |
| Bootstrap (commands + tools) | `bootstrap/v<semver>` |

Tags are annotated and created automatically by `/hub-publish-skills` and `/hub-commands-publish`. Knowledge / techniques / papers are content-addressed; their history *is* the trail.

```
/hub-install my-skill@1.1.0           # pinned install
/hub-sync --skill=my-skill --unpin    # resume tracking latest
/hub-commands-update --version=1.2.0  # rollback bootstrap to a tag
```

Recent releases: see [tags](https://github.com/kjuhwa/skills-hub/tags). Your installed bootstrap version is in `~/.claude/skills-hub/bootstrap.json`.

---

## Contributing

1. `/hub-extract` (full project) or `/hub-extract --session` (current session) → drafts under `.{skills,knowledge,technique,paper}-draft/`.
2. Review locally — sanitize, add examples, refine triggers; run the layer's `*-verify` to confirm structure.
3. `/hub-publish --pr` opens a branch + PR. Knowledge commits land first so skills/techniques can reference fresh slugs in the same branch.
4. Never push to `main` directly. Category proposals edit `CATEGORIES.md` in the same PR that adds the first entry using the new category.

Skills must be **generalizable** — no business names, credentials, internal URLs. `extract` writes only to draft dirs (already in `.gitignore`).

---

## License

MIT. Contributions welcome.
