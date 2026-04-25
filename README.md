# skills-hub

> **A self-correcting knowledge stack for Claude Code.** Atoms (skills + knowledge) compose into **techniques**, and **papers** test their own premises with experiments — partial refutations rewrite the premise, produce new corpus entries, and feed back into the catalog. Three papers have already closed their loops; this README documents how.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Bootstrap](https://img.shields.io/github/v/tag/kjuhwa/skills-hub?filter=bootstrap/v*&label=bootstrap&color=purple)](https://github.com/kjuhwa/skills-hub/tags)
[![Closed loops](https://img.shields.io/badge/closed_loops-3-2563eb?style=flat-square&logo=arc)](./paper)
[![Papers](https://img.shields.io/badge/papers-15-indigo?style=flat-square)](./paper)
[![Techniques](https://img.shields.io/badge/techniques-19-teal?style=flat-square)](./technique)
[![Skills](https://img.shields.io/badge/skills-1,105-blue?style=flat-square)](./index.json)
[![Knowledge](https://img.shields.io/badge/knowledge-894-green?style=flat-square)](./knowledge)
[![Examples](https://img.shields.io/badge/examples-622-orange?style=flat-square)](./example)

---

## What's different

Most catalogs are **read-only knowledge** — patterns, decisions, recipes you look up. This one is **read-write**: papers carry hypotheses about the corpus, run experiments against them, and **rewrite themselves when reality disagrees**.

Three papers have done this so far:

| # | Paper | Predicted | Measured | Verdict |
|---|---|---|---|---|
| 1 | `workflow/parallel-dispatch-breakeven-point` | parallel dispatch becomes net negative past 70% prior coverage | useful_output absolute count is the better gate | **partial** — premise rewritten, produced 1 new knowledge entry + 1 example |
| 2 | `arch/technique-layer-roi-after-100-pilots` | ≤20% of techniques cited 2+ times at N=100 | 11.8% at N=17, 97.3% atom-orphan rate at N=2000 | **partial** — power-law shape supported earlier than expected, generalized to atom layer |
| 3 | `arch/feature-flag-flap-prevention-policies` | hysteresis ratio 1.5–2x is universal optimum | flap-invariant on spiky workloads; "wider delays trip" was actually about debouncing, not hysteresis | **partial** — premise rewritten, produced [`example/arch/hysteresis-tuning-tool`](./example/arch/hysteresis-tuning-tool) |

Every loop closed at `partial`, not `yes`. That's the schema's intended shape: papers shipped as drafts and survived a real experiment usually need *some* refinement. The gap between the original claim and what the data actually supports is exactly where the corpus learns.

---

## The Four Layers

Two axes — **enforcement** (atoms → techniques) where everything has a pass/fail lint, and **exploration** (papers) where claims test themselves.

| Layer | What it is | Job | Schema gate |
|---|---|---|---|
| **`skill/`** | Atomic, executable procedure (recipe with triggers) | "do X" | frontmatter validated |
| **`knowledge/`** | Atomic, non-executable fact / decision / pitfall | "X is true because…" | frontmatter validated |
| **`technique/`** | Composition recipe — references 2+ atoms, never copies | "this is the *shape* of how X is done" | `composes[]` resolves; no technique-nesting (v0) |
| **`paper/`** | Hypothesis-driven argument with `premise.if/then`, `examines[]`, `experiments[]`, `outcomes[]` | "is X actually true? what happens if…?" | structure only (premise non-empty, ≥2 perspectives, refs resolve, completed-experiment fields consistent) |

```mermaid
graph TB
  subgraph exploration["exploration axis (loop-closing)"]
    direction LR
    P[("📄 paper<br/>premise → experiment → outcomes")]
  end
  subgraph enforcement["enforcement axis (pass/fail lint)"]
    direction LR
    T(["🔗 technique<br/>composes 2+ atoms"])
    subgraph atoms["atoms"]
      direction LR
      S[/"⚡ skill<br/>do X"/]
      K[/"💡 knowledge<br/>X is true"/]
    end
  end
  E[(["🧪 example<br/>concrete instantiation"])]

  P -.examines.-> T
  P -.examines.-> S
  P -.examines.-> K
  P -.examines.-> P
  T --composes--> S
  T --composes--> K
  P --proposed_builds--> E

  classDef axisLabel fill:#fff,stroke:#cbd5e1,color:#475569
  class exploration,enforcement,atoms axisLabel
```

The **live citation graph** of the actual corpus is in [`docs/citation-graph.mmd`](./docs/citation-graph.mmd) — auto-rebuilt by post-merge / post-commit git hooks, rendered directly by GitHub. Implemented papers show solid blue; drafts dashed.

**The exploration loop**: a `hypothesis` paper transitions `draft → implemented` only when at least one experiment completes with a non-null `result` and `supports_premise`. If the experiment partially refutes the original premise, the paper rewrites itself and emits new corpus entries via `outcomes[]`. Empty experiments + empty outcomes across ≥5 papers triggers **layer retraction** — the schema's own self-corrective gate.

**Why techniques exist**: `/hub-merge` *absorbs* atoms (good for true duplicates). `technique/` *references* atoms, so each atom retains independent versioning and can evolve under its compose call. A technique is the canonical home for the *pattern of combination*, not for the procedure itself. New techniques are surfaced from atom co-occurrence patterns by `_suggest_techniques.py`; #1120 was the first technique authored from a scanner suggestion.

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
/hub-suggest "<task description>"     pre-impl discovery — surfaces papers & techniques first, then atoms
/hub-paper-list --stale               papers ready to close (hypothesis + planned experiment + age ≥30d)
/hub-list --orphans                   uncited atoms — empirical input for the long-tail hypothesis paper
/hub-paper-experiment-run <slug>      guided loop closure — collect result, suggest premise rewrite, transition status
/hub-paper-from-technique <slug>      scaffold a paper that interrogates an existing technique
```

`git pull` alone keeps you current — the post-merge hook re-runs `install.sh` whenever `bootstrap/` changes.

---

## What you actually get

When you ask Claude Code to implement something, the pre-implementation hook silently runs `/hub-find` and surfaces matches across **all four layers**, with priority `paper > technique > skill > knowledge`. Concrete: when you say "구현해줘 / implement parallel dispatch", you get this *before* writing code:

```
[paper/workflow]    parallel-dispatch-breakeven-point
                    Past 70% prior coverage parallel dispatch is net negative
                    (REFINED 2026-04 — useful_output absolute count is the gate)
                    type=hypothesis status=implemented
[technique/arch]    gated-fallback-chain
                    Tiered fallback behind a feature flag with circuit-breaker awareness
                    composes 3 atoms

  ① 페이퍼 읽고 premise/perspectives 반영
  ② proposed_builds 에서 scaffold 시도 (/hub-make)
  ③ 건너뛰기
```

You decide whether the paper's findings change your approach *before* writing the code. The skills + knowledge are the implementation primitives; the paper is the warning that someone already measured this and the answer was non-trivial.

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
example/                      # ready-to-install reference projects (622)
docs/
  rfc/                        # paper-schema-draft.md, technique-schema-draft.md
  citation-graph.mmd          # live, auto-regenerated visualization
bootstrap/
  commands/                   # slash-command sources
  tools/                      # python helpers (lint, indexers, audits, injectors, suggesters)
  install.{sh,ps1}            # installers
CATEGORIES.md                 # canonical category list
citations.json                # reverse-lookup index (cited_by + produced_by)
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
| `/hub-paper-from-technique <slug>` | Scaffold a paper draft that interrogates an existing technique — pre-fills examines, perspectives, one experiment skeleton |
| `/hub-paper-experiment-run <slug>` | **Guided loop closure** — collect result + supports_premise + observed_at, prompt premise rewrite when partial/refute, transition status |
| `/hub-paper-verify <slug> \| --all` | Schema §6 gate — structure only, never validates claim substance |
| `/hub-paper-list [--status/--type/--stale]` | Status-grouped table; `--stale` flags hypothesis papers ready to close |
| `/hub-paper-show <slug>` | Body + inline-expanded `examines[]`/`requires[]`; experiments rendered as a status table |

### Technique layer

| Command | Purpose |
|---|---|
| `/hub-technique-compose <slug>` | Pick atoms, assign roles, generate `TECHNIQUE.md`, auto-verify |
| `/hub-technique-verify <slug> \| --all` | Schema §9 gate — composes refs exist, no nesting |
| `/hub-technique-list [--drafts-only]` | Local drafts + installed |
| `/hub-technique-show <slug>` | Body + expanded `composes[]` with inline atom descriptions |

### Atomic layers (skills + knowledge)

| Command | Purpose |
|---|---|
| `/hub-find "<query>"` | Ranked search (180+ KO↔EN synonyms; scores name/description/tags/triggers) |
| `/hub-suggest "<task>"` | **Pre-implementation discovery — searches all 4 layers**, surfaces paper/technique first |
| `/hub-install <name> [@version]` | Install one entry (`--all` for bulk, `--example` for demo projects) |
| `/hub-list [--orphans]` | What's installed; `--orphans` surfaces uncited atoms with empirical hub-wide rate |
| `/hub-show <name>` | Display content + **`Cited by`** block (techniques/papers that reference it) + **`Produced by`** block (papers whose outcomes shipped this atom) |
| `/hub-extract [keyword]` | Mine the current project; `--session` narrows to current session |
| `/hub-publish [--only ...] [--pr]` | Review drafts → branch + PR (one PR carries skills + knowledge + technique + paper drafts) |
| `/hub-sync` | Pull remote + refresh installs + rebuild indexes |
| `/hub-doctor` | Diagnose & repair local install |

### Maintenance

`/hub-merge`, `/hub-split`, `/hub-refactor`, `/hub-condense`, `/hub-cleanup` — all read-only on remote, produce drafts that ship through the normal publish flow.

`/hub-commands-update [--version=x.y.z]` rolls the slash commands forward or back to a tagged release. `/hub-commands-publish --bump=patch --pr` publishes local edits with a `bootstrap/v*` tag.

---

## Authoring

Each layer has its own concept page in the [wiki](https://github.com/kjuhwa/skills-hub/wiki) — start there for full schema details. Quick reference:

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
Schema: `docs/rfc/paper-schema-draft.md`. Verification is **structure only** — claim correctness is reviewer judgment, never a lint check. The complementary [falsifiability advisory](./bootstrap/tools/_audit_paper_falsifiability.py) flags `type: hypothesis` papers whose `premise.then` lacks a measurable predicate.

**Body structure — IMRaD.** Per [§5 of the schema doc](./docs/rfc/paper-schema-draft.md), bodies follow the international convention: `## Introduction / ## Methods / ## Results / ## Discussion`. Methods + Results apply only to `type: hypothesis`; survey/position papers carry just Introduction + Discussion. Compliance is audited by [`_audit_paper_imrad.py`](./bootstrap/tools/_audit_paper_imrad.py); migration is incremental.

**Optional `preprint/` directory.** A paper may carry a venue-ready LaTeX render at `paper/<category>/<slug>/preprint/paper.tex` for submission to arXiv / OpenReview / workshop venues. The first such package lives at [`paper/workflow/parallel-dispatch-breakeven-point/preprint/`](./paper/workflow/parallel-dispatch-breakeven-point/preprint/) — frontmatter remains canonical, the preprint is hand-mirrored from the IMRaD body.

---

## Stats (live)

The corpus measures itself:

| Signal | Value | Source |
|---|---|---|
| Atoms cited by ≥1 entry | 61 / 2,000 (3.0%) | `citations.json` |
| Atoms produced by paper outcomes | 3 | `citations.json` (schema 2) |
| Hypothesis papers with closed loop | 3 / 13 | `_audit_paper_loops.py` |
| Stale hypothesis papers (≥30d, planned exp) | 0 / 13 | `_audit_paper_loops.py --only-stale` |
| Falsifiability-flagged papers | 0 / 13 hypothesis | `_audit_paper_falsifiability.py` |
| IMRaD-compliant body structure | **15 / 15 (100%)** | `_audit_paper_imrad.py` |
| Papers with `preprint/` package | 1 / 15 | `paper/<…>/<…>/preprint/paper.tex` |
| §11 retraction signal | not fired | strict ratio (`experiments[]` AND `outcomes[]` both empty) is 0/15 — every paper carries at least planned experiments. Threshold 60 % at N≥5. |
| Suggested technique bundles ≥3 atoms | 2 strong candidates | `_suggest_techniques.py` |

These numbers are recomputed by `precheck.py` on every post-merge / post-commit hook fire. See [`bootstrap/tools/`](./bootstrap/tools/) for the audit + index pipeline.

---

## Versioning

| Tag scheme | Example |
|---|---|
| Per-skill | `skills/<name>/v<semver>` |
| Bootstrap (commands + tools) | `bootstrap/v<semver>` |

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

For papers specifically: a draft can stay at `status: draft` indefinitely with `experiments[].status: planned`. To reach `implemented`, run `/hub-paper-experiment-run` once the experiment actually completes — partial refutations rewrite the premise, full refutations move the paper to `retracted`. Both outcomes are valuable; the schema records them faithfully.

Skills must be **generalizable** — no business names, credentials, internal URLs. `extract` writes only to draft dirs (already in `.gitignore`).

---

## License

MIT. Contributions welcome.
