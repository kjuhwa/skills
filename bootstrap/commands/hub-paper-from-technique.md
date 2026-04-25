---
description: Scaffold a paper draft that interrogates an existing technique — premise prompt, examines pre-filled from technique's composes[], perspectives seeded, ready to refine.
argument-hint: <technique-slug> [--type=hypothesis|survey|position] [--category=<cat>]
---

# /hub-paper-from-technique $ARGUMENTS

Authoring a paper from scratch is a heavy lift — premise design, multi-perspective framing, picking what to examine, drafting an experiment. Authoring a paper that **interrogates an existing technique** is much lighter: the technique already names the atoms involved (`composes[]`), the binding decisions, and the failure modes implied by its `## When NOT to use` section. This command turns that latent material into a paper draft scaffold.

The goal is to lower the floor for paper authoring against existing techniques, so questions like "is this composition actually load-bearing?" or "what's the cost curve for this pattern at scale?" become 5-minute drafts instead of 1-hour blocks.

## Resolution

- `<technique-slug>` — locate first match in `~/.claude/skills-hub/remote/technique/**/<slug>/TECHNIQUE.md`, then `./.technique-draft/**/<slug>/`. Refuse if not found.
- `--type=<hypothesis | survey | position>` — paper type, default `hypothesis` (the most common shape for technique interrogation).
- `--category=<cat>` — paper category, default = technique's category. Override only if the paper's subject is conceptually different from the technique's domain.

## Steps

1. **Read the technique** (read-only):
   - Frontmatter: `name`, `description`, `category`, `tags`, `composes[]`, `binding`, `verify`.
   - Body: `## When to use`, `## When NOT to use`, `## Phase sequence`, `## Glue summary`, `## Known limitations`. These sections are mined for the paper scaffold.

2. **Propose a paper slug:**
   - Default: `<technique-slug>-<type-suffix>` where suffix depends on type:
     - `hypothesis` → `-cost-curve` / `-breakeven-point` / `-failure-modes` (interactive pick) or user-supplied
     - `survey` → `-landscape` or `-comparison`
     - `position` → `-policy` or `-default-rule`
   - Show the proposal, allow override.

3. **Premise scaffold** (interactive — premise-first, just like `/hub-paper-compose`):

   Show prompts that draw from the technique:

   ```
   This technique composes <N> atoms: <list>.
   The technique's "When NOT to use" lists: <list>.
   Glue summary describes: <one-line>.

   What's your premise.if?
     (typical patterns:
      - "When this technique is applied at scale of N >= ..."
      - "When team X adopts <technique> without <prerequisite>"
      - "When the composition runs in <constrained-environment>")

   What's your premise.then?
     (typical patterns:
      - "<measured-outcome> degrades by X% past threshold Y"
      - "<silent-failure-mode> occurs in K% of runs"
      - "Cost displaces from <axis> to <other-axis>")
   ```

   Both `if` and `then` must be non-empty (≥ 1 char after strip). Refuse to proceed otherwise.

4. **Pre-fill `examines[]`:**
   - Add the technique itself: `{ kind: technique, ref: <category>/<slug>, role: subject }`. (paper citing technique — the reverse-citation hub will surface this.)
   - Add each `composes[].ref` from the technique with role: same role as in `composes[]` (e.g. `orchestrator` carries forward).
   - User can prune (deselect any) or add more via interactive search (`/hub-find` integration).

5. **Seed `perspectives[]`** (≥ 2 required by schema):
   - Default 4 perspectives drawn from common technique-interrogation angles:
     1. **Cost Model** — "what does this technique cost in time / tokens / cognitive load?"
     2. **Failure Modes** — drawn from the technique's `## When NOT to use` and `## Known limitations`
     3. **Adoption Curve** — "what conditions does the team need to hit before this technique pays for itself?"
     4. **Counter-Argument** — "what would refute the premise? what's the strongest case for the opposite conclusion?"
   - User can keep, edit, or replace any of these. Edits inline (name + 1-2 line summary).

6. **Seed `proposed_builds[]`** (typical: 1-3):
   - Default suggestions based on type:
     - `hypothesis` → `<slug>-benchmark` (POC measuring the premise's threshold)
     - `survey` → `<slug>-comparison-matrix` (POC mapping the landscape)
     - `position` → `<slug>-default-policy` (DEMO codifying the rule)
   - Each pre-filled with `requires:` listing the technique itself + 1-2 of its composed atoms (so the non-triviality gate, rule 13, doesn't WARN).
   - User edits / adds / removes.

7. **Seed `experiments[]`** (only for `type: hypothesis`, ≥ 1):
   - Default skeleton:
     ```yaml
     - name: <slug>-curve
       hypothesis: <one-line restatement of premise.then>
       method: |
         (TODO — design measurement; typical shape:
          replay N representative invocations of <technique> at varying
          conditions, measure <outcome>, plot curve, identify break-even.)
       status: planned
       built_as: null
       result: null
       supports_premise: null
       observed_at: null
     ```
   - User fills `method` (the only field that requires real thought at compose time).

8. **Write the draft:**
   - Target: `.paper-draft/<category>/<slug>/PAPER.md`.
   - Frontmatter assembled from steps 3-7. Version `0.2.0-draft`. Status `draft`.
   - Body skeleton (same as `/hub-paper-compose`) with `## Background` pre-filled with a paragraph naming the technique and pointing to its TECHNIQUE.md.
   - Auto-inject `## References (examines)` and `## Build dependencies` body sections via `_inject_references_section.py`.

9. **Immediate verification:**
   - Run `/hub-paper-verify <slug>`. PASS / WARN / FAIL handled same as `/hub-paper-compose` step 14.
   - Print location + next step:
     ```
     DRAFT CREATED: .paper-draft/<category>/<slug>/PAPER.md
     Subject technique: <category>/<slug>
     Examines pre-filled: <N> entries
     Perspectives seeded: 4 (edit or replace)
     Experiment status: planned (run via /hub-paper-experiment-run when ready)

     Next:
       • Refine perspectives + experiment.method
       • /hub-publish --only paper --pr
     ```

## Rules

- Never modify the source TECHNIQUE.md. Read-only on the technique.
- Refuse if a paper at `<slug>` already exists in either `.paper-draft/` or installed `paper/` — propose appending a suffix (`<slug>-v2`, `<slug>-revisited`).
- Pre-fill aggressively but do not lock fields. Every seeded `perspective` / `proposed_build` / `experiment` is editable in step 5/6/7. The goal is *acceleration*, not *prescription*.
- The seeded `examines[]` includes the technique itself (`kind: technique`). The v0 → v0.2.1 schema doesn't restrict this — the only restriction is `proposed_builds[].requires[].kind: paper` (still banned).
- `type=hypothesis` is the default because it forces the loop-closing path — `/hub-paper-experiment-run` then has work to do later. `type=survey` and `position` are valid but skip step 7.

## Example

```
/hub-paper-from-technique safe-bulk-pr-publishing

▶ technique: workflow/safe-bulk-pr-publishing
▶ composes: [orchestrator, rollback-anchor, conflict-recovery]
▶ when NOT to use: ['atomic operations', 'single PR']
▶ proposing slug: safe-bulk-pr-publishing-cost-curve
▶ type: hypothesis (default)

premise.if?
> When N pull requests are published in one run with this technique
premise.then?
> The expected gain over per-PR publishing inverts past N≈30 because
  conflict-recovery passes scale O(N²) on average and the rollback anchor
  becomes a single point of contention.

examines (pre-filled, edit/prune):
  ✓ technique workflow/safe-bulk-pr-publishing  role=subject
  ✓ skill workflow/parallel-build-sequential-publish  role=orchestrator
  ✓ skill workflow/rollback-anchor-tag-before-destructive-op  role=failure-recovery
  ✓ knowledge workflow/batch-pr-conflict-recovery  role=conflict-resolution
  add more? (n)

perspectives (4 seeded, edit/replace):
  1. Cost Model
  2. Failure Modes (drawn from "When NOT to use")
  3. Adoption Curve
  4. Counter-Argument
  edit? (n)

proposed_builds (default seeded):
  1. safe-bulk-pr-publishing-benchmark — POC measuring per-N runtime + conflict frequency
     requires: technique:safe-bulk-pr-publishing, skill:parallel-build-sequential-publish
  edit? (n)

experiment (1 seeded):
  name: safe-bulk-pr-publishing-curve
  method: > Replay 50 historical bulk-publish runs at N ∈ {5, 15, 30, 60} and measure
            wall-clock + conflict-recovery iterations + manual-intervention count.
  edit method? (n)

writing .paper-draft/workflow/safe-bulk-pr-publishing-cost-curve/PAPER.md … done
running /hub-paper-verify … PASS

DRAFT CREATED. Next: /hub-publish --only paper --pr
```

## Why exists

15 papers exist; only 1 has closed its loop. The rest were authored from a blank slate, which takes long enough that running the experiment afterward feels like a separate project. Authoring against an existing technique reuses the technique's structural decisions (atoms, binding, failure cases) so the author can spend their attention on what matters — the premise and the experiment design — instead of the framing scaffold.

The companion command `/hub-paper-experiment-run` then closes the loop. Together: scaffold from technique → run experiment → close loop → produce corpus update.
