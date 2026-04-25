---
version: 0.2.0-draft
name: technique-layer-composition-value
description: Does a technique/ middle layer in a skills hub produce composition value beyond what hub-merge already provides?
category: workflow
tags:
  - meta
  - composition
  - hub-architecture
  - technique-layer

type: position

premise:
  if: A skills-hub adds a technique/ layer composing atoms by reference (not copy)
  then: Durable composition value emerges — recipes that survive atom updates, generalize across shapes (linear and branching), and act as cite-able units for papers and apps — value not reproducible by hub-merge alone

examines:
  - kind: technique
    ref: workflow/safe-bulk-pr-publishing
    role: pilot-linear
    note: "pilot #1 (linear pipeline, 4 composes)"
  - kind: technique
    ref: debug/root-cause-to-tdd-plan
    role: pilot-decision
    note: "pilot #2 (decision tree, 4 composes)"
  - kind: skill
    ref: workflow/parallel-build-sequential-publish
    role: atom-whose
    note: atom whose relocation surfaced the layout mismatch (RFC §4 evidence)
  - kind: knowledge
    ref: workflow/batch-pr-conflict-recovery
    role: atom-demonstrating
    note: "atom demonstrating failure-mode role in pilot #1"

perspectives:
  - name: Maintainability
    summary: How does a technique behave when a composed atom is renamed or moved? Tested against the parallel-build-sequential-publish relocation mid-rollout.
  - name: Cognitive Load
    summary: Does a user searching "safe bulk PR" gain more from a single technique hit than from four scattered atom hits?
  - name: Research Integration
    summary: Can papers cite techniques as first-class subjects? This paper is itself the first test of that capability — if the citation isn't structurally useful, the layer is suspect.
  - name: Rollout Cost
    summary: The 13-PR chain that shipped this layer — is the pattern replicable, and what does it suggest about adding future layers (papers included)?

external_refs: []

proposed_builds:
  - slug: hub-paper-commands
    summary: Four /hub-paper-{compose,verify,list,show} commands mirroring /hub-technique-* with verify scoped to structure only (premise presence, examines resolution, perspectives ≥2)
    scope: poc
    requires:
      - kind: technique
        ref: workflow/safe-bulk-pr-publishing
        role: shape-template
        note: shape template for composition-by-reference commands
      - kind: technique
        ref: debug/root-cause-to-tdd-plan
        role: second shape template
        note: second shape template — tests command generality across paper shapes
  - slug: security-domain-technique-3
    summary: A third pilot technique in a domain untouched by the first two (e.g. security/secret-rotation-safe-handover) to further stress schema generality past n=2
    scope: poc
    requires:
      - kind: technique
        ref: workflow/safe-bulk-pr-publishing
        role: reference-shape
        note: reference shape (linear pipeline)
      - kind: technique
        ref: debug/root-cause-to-tdd-plan
        role: reference-shape
        note: reference shape (decision tree)
  - slug: hub-make-from-paper
    summary: Extension of /hub-make that reads a paper's proposed_builds[] and scaffolds each as an example/ draft, closing the paper → app loop
    scope: demo
    requires: []
    # NOTE: empty requires triggers v0.2 non-triviality WARN. Accepted because this
    # build's dependency is the paper SCHEMA itself, not any specific corpus atom.
    # A future v0.2.1 may extend requires to allow kind:schema refs.

experiments: []
# This is a type=position paper — no experiments required by the schema.
# The original draft was type=hypothesis, but the falsifiability advisory
# correctly flagged the premise.then as qualitative (no numeric threshold,
# no comparator). Re-typed to position, which is the honest categorisation:
# this paper argues for the technique layer's existence based on observed
# pilots, rather than predicting a specific measurable outcome at scale.
#
# Future quantification can spawn separate type=hypothesis papers against
# specific sub-claims (e.g., paper/arch/technique-layer-roi-after-100-pilots
# already does this for citation distribution at the layer level).

outcomes:
  - kind: produced_technique
    ref: workflow/safe-bulk-pr-publishing
    note: This paper's examines[0]; the paper framework was drafted alongside this pilot's authoring.
  - kind: produced_technique
    ref: debug/root-cause-to-tdd-plan
    note: This paper's examines[1]; second pilot established shape generality.
# outcomes[] here is weak — the paper did not CAUSE these techniques; it observes
# them as pre-existing. A stronger outcomes[] appears once proposed_builds ship.

status: draft
retraction_reason: null
---

# Does the `technique/` middle layer produce durable composition value?

## Introduction

**If** a skills-hub adds a `technique/` layer that composes atoms by reference (not by copy), **then** durable composition value emerges — recipes that survive atom updates, generalize across shapes (linear pipelines and branching decision trees), and serve as cite-able units for papers and apps — value that `hub-merge` alone cannot reproduce.

This is a proposal, not a proof. The evidence below is from one rollout across roughly thirty hours and fifteen PRs; the claim is that the value is **durable**, which is a longer-horizon bet. What the rollout can show is whether the **shape** of the value is the shape the claim predicts.

### Background

Before this rollout the hub had two tiers with a gap:

```
knowledge ──┐
skill     ──┼──► [user hand-assembles every time] ──► example
```

`hub-merge` existed as a composition tool but it **absorbs and destroys** the source atoms — a merged skill loses its standalone identity, and no other technique can reuse the same atoms afterward. It is a composition that eats its own inputs.

The rollout introduced `technique/` as a third tier where composition is **by reference**: a technique names its atoms and leaves them in place. Atoms remain independent and reusable across multiple techniques.

Two pilots shipped on purpose different shapes:

- **Pilot #1** — linear pipeline, four composes: anchor → build → publish → recover
- **Pilot #2** — decision tree, four composes: investigate → hypothesize → (build-error-triage | triage-issue)

Schema supported both without modification.

### Prior art

`external_refs[]` is deliberately empty at first draft. Relevant searches for `/hub-research`:

- "Composition layers between primitive and application" in developer-tool ecosystems (build tools, package managers, agent frameworks).
- UNIX pipes and small-tools philosophy as a reference model for by-reference composition.
- "Behavior trees" and "state machines" literature for decision-tree shape validation (relevant to pilot #2).
- Prior work on documentation-as-code where structured prose cites structured artifacts (literate programming, Jupyter, MDX).

A reviewer filling these in would strengthen the paper materially. Absence is flagged but not fatal.

## Discussion

### 1. Maintainability

The rollout exposed a real atom relocation event. `parallel-build-sequential-publish` was declared `category: workflow` in its frontmatter but lived at the root of `skills/`. PR #1063 moved it under `skills/workflow/`. Pilot #1's `composes[0].ref` had to update from `parallel-build-sequential-publish` to `workflow/parallel-build-sequential-publish`.

What this tells us:

- The technique's `ref` field is a **hard coupling** to a path. Rename the atom → break the technique.
- The schema response was to define `ref` as kind-root-relative physical path (RFC §4), not as semantic `{category}/{slug}`. This made breakage **catch-able** by `/hub-technique-verify` rather than silent.
- Follow-on: PR #1068 added a lint rule at publish time that fails if `composes[].ref` doesn't resolve on disk. A future rename therefore fails at the hub level before users see a broken technique.

The claim this supports: techniques **survive atom changes via catch-and-fail, not via auto-migration**. That is a weaker form of durability than "atoms can change freely and techniques still work," but it is stronger than nothing: silent rot becomes noisy failure.

### 2. Cognitive Load

Under the old two-tier model, a user wanting "safe bulk PR publishing" had to know and assemble:

1. `skills/workflow/parallel-build-sequential-publish` (orchestrator)
2. `skills/workflow/rollback-anchor-tag-before-destructive-op` (pre-flight safety)
3. `knowledge/workflow/batch-pr-conflict-recovery` (failure recovery)
4. `knowledge/pitfall/gh-pr-create-race-with-auto-merge` (race-condition pitfall)

Four separate lookups, four contexts, and the mental work of deciding in what order and at what trigger points they apply.

Under the technique model, the same flow surfaces as **one** `/hub-find` hit: `technique/workflow/safe-bulk-pr-publishing`. The atoms are still there for people who want to read them — the technique's `composes[]` is an index, not a hiding layer. What the technique removes is the **assembly step**, not the primary material.

That assembly step is where errors happen. The pilot's glue section lists four items the atoms alone do not tell a user:

| Added element | Where |
|---|---|
| Anchor tag-slug convention (`pre-bulk-pr-<date>`) | Phase 0 |
| Executor prohibitions on shared-catalog edits | Phase 1 |
| Race-vs-failure branching for `gh pr create` | Phase 2 |
| Recovery-mode trigger rule (N ≥ 3 CONFLICTING) | Phase 3 |

None of the four are reproducible from reading the atoms. They live in the technique's body, not in the composed pieces. This is where the layer adds net value — it stores the connective tissue.

### 3. Research Integration

This paper examines two techniques as first-class units (`examines[]`). The question is whether that citation is **structurally useful** or just decorative.

Useful tests:

- A reader of this paper can follow `examines[0].ref` → `technique/workflow/safe-bulk-pr-publishing` and reach the exact pilot. No dereferencing by name or guesswork.
- A future tool (`/hub-find --papers-citing workflow/safe-bulk-pr-publishing`) could list every paper that `examines` a given technique. The data is already structured for that.
- If the technique is renamed, lint catches the broken citation in the paper just as it does in another technique.

Decorative would look like: "In this paper we discuss pilot #1 and pilot #2." No navigable link, no broken-citation detection, no reverse-index.

The test passes only weakly at `n=1` — this paper is the only example. If no second paper ever cites `technique/workflow/safe-bulk-pr-publishing`, the citation infrastructure is unused overhead. §13 of the schema draft acknowledges this risk: the `paper/` layer retracts if papers don't produce something a technique or knowledge entry could not hold.

### 4. Rollout Cost

The 13-PR chain that shipped this layer:

- #1058 RFC + 2 pilots
- #1059 5 slash commands
- #1060 /hub-find extension + index builder awareness
- #1061 English translation (user-flagged consistency breach)
- #1062 technique-aware lint / index / status / list / precheck
- #1063 parallel-build skill relocation (the §4 finding in action)
- #1064 index.json regeneration (uncovered two nested bugs: flat parser for composes list, and preserve_extras overriding recomputed fields)
- #1065 corpus frontmatter backfill (17 files)
- #1066 normalize compound categories
- #1067 lint category format (prevent regression of #1066)
- #1068 lint technique composes refs (structure-only verification)
- #1069 /hub-tools-update command
- #1070 README refresh

And four bootstrap tags: v2.6.14 → v2.6.17.

The pattern: design → 2 pilots → commands → tooling → release tag, with corpus hygiene forced by the lint passes along the way. Replicable for the `paper/` layer under this paper's first proposed build.

What the rollout was *not*:

- Not a smooth one-shot landing. Every tooling PR surfaced at least one bug or data issue from the existing corpus.
- Not free of user feedback. #1061 (language consistency) would not have been caught by any automated check — it took the user noticing.
- Not obvious in size. The 13 PRs were not budgeted in advance. If the pattern is replicable, the estimate for a paper-layer rollout is ~8–12 PRs, with similar open-ended tail.

### Proposed builds (rationale)

### `hub-paper-commands` (POC)

Mirror of the four `/hub-technique-*` commands, with these deltas:

- `/hub-paper-compose` prompts premise **first** (the `if/then`) before anything else. An author who cannot state the premise in two lines is not ready to compose the paper.
- `/hub-paper-verify` checks only structure per schema §6: premise presence, examines resolution, perspectives ≥ 2, description ≤ 120, `status` enum. **No substance checks.**
- `/hub-paper-list` shows `status` column and filters on `--status draft|reviewed|implemented|retracted`.
- `/hub-paper-show` expands `examines[]` inline (like technique-show) and renders perspectives as numbered sections.

Replicates the technique rollout shape. Estimated 1–2 PRs.

### `security-domain-technique-3` (POC)

The third technique pilot — in a domain deliberately chosen outside workflow/ and debug/. Proposal: `security/secret-rotation-safe-handover`.

Composes (sketch, atoms to verify exist in hub):

- skill: `security/<existing-rotation-skill>` — the rotation procedure
- skill: `workflow/rollback-anchor-tag-before-destructive-op` — reused cross-domain atom
- knowledge: `pitfall/<secret-exposure-class>` — failure-mode atom

If the atoms do not already exist in sufficient quality, the pilot either authors missing ones first or picks a different third domain. The purpose is n=3 generality, not that specific topic.

### `hub-make-from-paper` (DEMO)

Extension of `/hub-make` that takes a paper slug, reads its `proposed_builds[]`, and scaffolds each as a draft under `example/<category>/<build-slug>/` with a README referencing the parent paper. Closes the paper → app loop that otherwise sits as prose.

Carries a specific risk: if the paper's `proposed_builds[]` are too abstract, the scaffolds are empty folders. `/hub-make-from-paper` should refuse to scaffold a build whose `summary` is under ~60 characters, forcing the paper author to write a concrete-enough stub.

### Limitations

- **n=1** paper. Generalization claims rest on one test. A second paper on an unrelated topic is needed before the layer's generality is anything more than asserted.
- **Self-referential pilot.** This paper's subject is the layer immediately above it in the hub and its proposed builds include the tooling for its own layer. That is not a neutral test. A paper on something the author did not recently ship would be a stronger check.
- **Durability is asserted, not measured.** The premise claims value "survives atom updates" and "generalizes across shapes." The evidence is one rename event (#1063) and two shapes (n=2). A longer window and more pilots are required before that claim is anything more than plausible.
- **Retraction criteria not exercised.** §11 of the schema says the layer retracts if the first pilot looks like an RFC or blog post. This paper does enough differently (structured citations, multi-angle, concrete proposed builds) to not obviously trigger retraction, but the determination requires a reviewer who did not author it.

### Future work

1. When a `proposed_builds[]` item becomes a real `example/` entry, how is the back-link recorded? (§12 Q2 of the schema draft.) Proposal: add optional `example_ref` to each proposed_build; transition `status` to `implemented` when any proposed_build has a resolved `example_ref`.
2. Is `examines[].kind: doc` (for citing `docs/rfc/...`) worth adding? Avoided in v0 for scope, but documents in the repo are legitimately cite-able subjects. Probably yes in v0.1.x or v0.2.
3. Does the `no paper-to-paper citation` rule (§7) survive first contact with real writing? Academic papers cite papers. Watch for authors routing around it via `external_refs` (citing the paper by URL to its GitHub blob) — if that happens, v0.2 should lift the restriction.

<!-- references-section:begin -->
## References (examines)

**technique — `workflow/safe-bulk-pr-publishing`**
pilot #1 (linear pipeline, 4 composes)

**technique — `debug/root-cause-to-tdd-plan`**
pilot #2 (decision tree, 4 composes)

**skill — `workflow/parallel-build-sequential-publish`**
atom whose relocation surfaced the layout mismatch (RFC §4 evidence)

**knowledge — `workflow/batch-pr-conflict-recovery`**
atom demonstrating failure-mode role in pilot #1


## Build dependencies (proposed_builds)

### `hub-paper-commands`  _(scope: poc)_

**technique — `workflow/safe-bulk-pr-publishing`**
shape template for composition-by-reference commands

**technique — `debug/root-cause-to-tdd-plan`**
second shape template — tests command generality across paper shapes

### `security-domain-technique-3`  _(scope: poc)_

**technique — `workflow/safe-bulk-pr-publishing`**
reference shape (linear pipeline)

**technique — `debug/root-cause-to-tdd-plan`**
reference shape (decision tree)

<!-- references-section:end -->

## Provenance

- Authored: 2026-04-24
- Status: pilot #1 for the `paper/` layer schema v0.1
- Schema doc: `paper-schema-draft.md`
- Subject material: shipped in PRs #1058 through #1070 on `kjuhwa/skills-hub`, tags `bootstrap/v2.6.14` through `bootstrap/v2.6.17`
- Body migrated to IMRaD structure 2026-04-25 per `docs/rfc/paper-schema-draft.md` §5 by `_migrate_paper_to_imrad.py`. Pre-IMRaD body is preserved in git history; no semantic claims were rewritten during the migration. For hypothesis-type drafts, Methods + Results sections are stubs until the experiment completes.
