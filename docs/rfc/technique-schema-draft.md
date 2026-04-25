---
doc: technique-schema-draft
status: draft-v0.1
author: kjuhwa@nkia.co.kr
date: 2026-04-24
---

# `technique/` — Middle-Layer Schema Draft (v0.1)

## 1. Why

Today the hub has **atomic units** (`skills/`, `knowledge/`) and **finished artifacts** (`example/`). In practice, most real work requires combining 2–N atoms in a specific order or with specific conditions to produce a result. The combination itself cannot be stored as a reusable unit anywhere, so users hand-assemble the same sets over and over.

`technique/` is the missing **middle layer**:

```
knowledge  ─┐
skill      ─┼──►  technique  ──►  example (instance)
research   ─┘
```

- A technique **references** skills/knowledge without duplicating them (no content copy).
- Gaps in coverage are filled by `hub-research` and folded into the technique body.
- An `example` is a one-off artifact produced by executing a technique; the technique is the **reproducible recipe**.

## 2. Boundary with existing concepts

| Concept | Location | Unit | Reusability | Composition |
|---|---|---|---|---|
| skill | `skills/{cat}/{slug}/SKILL.md` | atomic procedure | high | single |
| knowledge | `knowledge/{cat}/{slug}.md` | atomic fact/lesson | high | single |
| **technique** | `technique/{cat}/{slug}/TECHNIQUE.md` | **composition recipe** | **high** | **multiple references** |
| example | `example/{cat}/{slug}/` | finished artifact | low (demo) | artifact only |
| hub-merge | command | merge (copy/absorb) | — | one-time |

Difference from `hub-merge`: merge **absorbs and destroys** the source skills; a technique leaves the atoms intact and only **references** them. That preserves atom independence so other techniques can reuse the same atoms.

## 3. Directory and file layout

```
technique/
  <category>/
    <slug>/
      TECHNIQUE.md         ← frontmatter + body (required)
      verify.sh            ← composition check script (optional)
      resources/           ← auxiliary assets (optional: images, samples)
```

Categories reuse the existing `CATEGORIES.md`. No new categories are introduced for techniques (use tags for fine-grained attributes).

## 4. Frontmatter schema

```yaml
---
version: 0.1.0                  # semver, draft-0 allowed
name: <slug>                    # must match the directory name
description: <single line, ≤120 chars>   # when to use it, 1 sentence
category: <one of CATEGORIES.md>
tags: [<string>, ...]

composes:                       # the core field: which atomic units are combined
  - kind: skill                 # skill | knowledge
    ref: workflow/autoplan      # kind-root-relative physical path
                                # ※ can diverge from frontmatter category,
                                #   so use the actual path (pilot finding)
    version: "^1.0.0"           # semver range (loose) or exact value (pinned)
    role: orchestrator          # short label (≤30 chars) — this atom's job in the composition
    note: optional long-form prose if you need to explain the role in narrative
  - kind: knowledge
    ref: workflow/batch-pr-conflict-recovery
    version: "*"                # any version allowed
    role: failure-mode

requires_research:              # optional: external research gaps
  - topic: "GitHub GraphQL rate limit"
    rationale: "hub-research needed to confirm current quota"

binding: loose                  # loose (default) | pinned
                                #   loose: passes as long as the version range is satisfied
                                #   pinned: exactly that version/commit only

verify:                         # optional runtime sanity checks
  - "every composes.ref is currently installed"
  - "every composes[].version range intersects the installed version"
  - cmd: "./verify.sh"          # custom verification
---
```

## 5. Binding mode (the key tradeoff)

| Mode | Behaviour | Pros | Cons |
|---|---|---|---|
| `loose` (default) | references by semver range, re-validates installed version at use time | absorbs downstream skill updates automatically | downstream breaking changes require technique re-verification |
| `pinned` | locked to a specific version (or commit SHA) | 100 % reproducibility | grows stale as downstream skills evolve |

**Recommendation**: start every technique at `loose`. Reserve `pinned` for production/audit paths. `hub-precheck` should warn when a `pinned` technique references a version that no longer exists in the hub.

## 6. Lifecycle

```
draft (.technique-draft/)   ──►  publish (technique/)   ──►  outdated (auto-flagged)
     ▲                                                              │
     └─── hub-refactor, hub-split ────────────────────────────────┘
```

- `.technique-draft/`: local staging area, mirroring `.skills-draft/`/`.knowledge-draft/`.
- Publish promotes to `technique/{cat}/{slug}/`.
- **Outdated detection**: when a referenced skill/knowledge has a new major version, the technique is tagged `outdated: true` in `index.json`. `hub-precheck` surfaces the report.

## 7. Registry integration

`~/.claude/skills-hub/registry.json` extension:

```json
{
  "version": 3,                 // bump 2 → 3
  "skills": { ... },
  "knowledge": { ... },
  "techniques": {               // new section
    "<cat>/<slug>": {
      "category": "workflow",
      "scope": "global",
      "path": "~/.claude/techniques/<cat>/<slug>/",
      "installed_at": "2026-04-24",
      "version": "0.1.0",
      "source_commit": "<sha>",
      "pinned": false,
      "composes_snapshot": [    // resolved versions at install time
        {"kind":"skill","ref":"workflow/autoplan","resolved_version":"1.2.3"},
        {"kind":"knowledge","ref":"workflow/batch-pr-conflict-recovery","resolved_version":"0.1.0"}
      ]
    }
  }
}
```

`composes_snapshot` provides post-hoc traceability — in `loose` mode it is the single source of truth for "what resolved to what at install time" when debugging a broken technique.

## 8. index.json integration

Add a `technique` kind to the master/lite/category indexes. Search (`hub-find`) matches skills/knowledge/techniques uniformly but renders a `kind: technique` badge on result rows for differentiation.

## 9. Verification rules (publish and precheck)

1. Every `composes[].ref` resolves to an **actual file** in the hub (checked against the filesystem, independent of declared category).
2. Every `version` range has a **non-empty intersection** with the installed version.
3. No circular references: a technique **must not** reference another technique (v0 permits flat 1-depth only; nesting is deferred to v0.2).
4. `description` is required and ≤120 chars.
5. `name` equals the containing directory name.
6. If `verify.sh` exists it must exit 0.
7. `ref` is kind-root-relative physical path (e.g. `workflow/parallel-build-sequential-publish` or `pitfall/gh-pr-create-race-with-auto-merge`).

## 10. Slash commands (implemented in step 3, listed here for reference)

- `/hub-technique-compose <slug>` — draft authoring workflow (skill/knowledge selection → frontmatter generation)
- `/hub-technique-list` — installed technique list
- `/hub-technique-show <slug>` — body + composition expansion
- `/hub-technique-install <ref>` — install from remote
- `/hub-technique-verify <slug>` — validate `composes[]` state
- Existing `/hub-find`, `/hub-status`, `/hub-precheck` are **extended** to read the new section

## 11. Open issues

- **Q1.** Should technique-to-technique composition be allowed? → No in v0. Risk of coupling and cycles. Revisit in v0.2.
- **Q2.** Should `loose` mode carry a lockfile? → `composes_snapshot` is judged sufficient. No separate lockfile.
- **Q3.** Link examples to techniques? → Proposal: add optional `produced_by_technique: <ref>` field to `example/` frontmatter. Separate PR, outside this doc's scope.
- **Q4.** Add a category? → Not needed. Existing categories + tags cover the space.
- **Q5.** (Found in pilot #2) `composes[]` is currently an **unordered set**. A linear pipeline can be expressed via role labels like "phase-0-anchor"; a branching decision tree is expressed only in prose. v0 accepts this (free-text `role` is sufficient). A formal phase/branch DSL is deferred to v0.2 pending more pilots.

## 12. Pilot candidates (input to step 2)

Once this schema is approved, the first technique comes from one of these pairings:

- `workflow/autoplan` + `workflow/batch-pr-conflict-recovery` → **"Safe bulk PR automation"**
- Alternative: the already-installed `swagger-ai-optimization` alone — useful as a negative test case (a single skill is **not** a technique, which itself verifies the schema)

---

**Next step.** Confirm the following three points from this draft:
1. Default binding (`loose` proposed)
2. v0 nesting ban (proposed)
3. Pilot-candidate selection

Once confirmed, proceed to step 2 (author the first pilot technique).
