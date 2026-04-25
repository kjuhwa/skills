---
description: Show a paper's frontmatter, body, and expanded examines[]/requires[] (inline descriptions of cited atoms/techniques). v0.2-aware — renders experiments and outcomes explicitly.
argument-hint: <slug> [--raw]
---

# /hub-paper-show $ARGUMENTS

Display one paper with its cited refs expanded in-place so the reader can evaluate the argument without jumping across multiple files.

## Input resolution

Same as `/hub-paper-verify`: first match in `./.paper-draft/**/<slug>/PAPER.md`, then `~/.claude/papers/**/<slug>/PAPER.md`.

## Steps

1. Read the paper file.
2. Print the frontmatter block verbatim.
3. **VERDICT banner** (v0.3 §15.3) — when `status=implemented` AND `verdict.one_line` is non-empty:
   ```
   ════════════════════════════════════════════════════════════════
   VERDICT  (refined <N>×, last <YYYY-MM>)
   ════════════════════════════════════════════════════════════════
   <verdict.one_line>

   Decision rule:
     WHEN    <verdict.rule.when>
     DO      <verdict.rule.do>
     THRESH  <verdict.rule.threshold>      # omit row if empty

   Belief delta:
     BEFORE  <verdict.belief_revision.before_reading>
     AFTER   <verdict.belief_revision.after_reading>
   ```
   - `<N>` and `<YYYY-MM>` come from `len(premise_history)` and `premise_history[-1].date[:7]`. Suffix omitted when no revisions.
   - When `status=implemented` AND `verdict.one_line` is empty, print `⚠ [verdict missing]` instead of the banner.
   - On `status=retracted`, the retraction banner (see Rules) takes precedence; the VERDICT block is skipped.
4. **APPLICABILITY block** (v0.3) — when any `applicability.*` sub-list is non-empty:
   ```
   ════════════════════════════════════════════════════════════════
   APPLICABILITY
   ════════════════════════════════════════════════════════════════
   Applies when (<N>):
     • <each applies_when entry>
   Does NOT apply when (<N>):
     • <each does_not_apply_when entry>
   Invalidated if observed (<N>):
     • <each invalidated_if_observed entry>
   Decay: <decay.half_life>
     <decay.why>
   ```
   Render only sub-blocks with entries; silently skip empty ones.
5. **PREMISE TRAIL** (v0.3) — when `premise_history[]` is non-empty:
   ```
   ════════════════════════════════════════════════════════════════
   PREMISE TRAIL  (<N> revision(s))
   ════════════════════════════════════════════════════════════════
   [1] <date>
       IF:    <prior premise.if>
       THEN:  <prior premise.then>
       CAUSE: <cause>
   [2] ...
   ```
   Listed in frontmatter order. The current `premise.if/then` is the latest; this block shows what *was* believed before.
6. **Expand examines[]** — for each entry:
   - Resolve path per kind (skill/knowledge/technique/paper); v0.2.1 allows `kind: paper`
   - Read the resolved file's frontmatter; extract `name`, `version`, `description`/`summary`
   - Print an annotated line:
     ```
     [technique] workflow/safe-bulk-pr-publishing v0.1.0-draft  (role: pilot #1)
                 → Build N projects in parallel ... batch conflict recovery
     ```
   - If ref resolves to missing file, mark `[MISSING]` and continue
7. **Render perspectives[]** — numbered sections with `name` and `summary`
8. **Render experiments[]** (v0.2 + v0.3) — table showing:
   ```
   EXPERIMENTS
     [1] coverage-threshold-measurement
         hypothesis: ...
         status: completed  supports_premise: partial  observed: 2026-04-24
         built_as: example/workflow/coverage-gate-benchmark → Interactive cost-model benchmark
         result: ...
         measured (<N>):                            # v0.3, omit block if empty
           <metric>  <value> <unit>  — <condition>
         refutes:                                   # v0.3, omit block if empty
           • <each phrase>
         confirms:                                  # v0.3, omit block if empty
           • <each phrase>
   ```
   If `experiments[]` is empty AND `type=hypothesis`, print a WARN banner: `paper cannot reach status=implemented without a completed experiment`.
9. **Render proposed_builds[]** with `requires[]` expanded — for each build, show its `requires` refs inline with one-line descriptions (same pattern as examines expansion).
10. **Render outcomes[]** (v0.2) — for each outcome, resolve the `ref` to its current description if possible; show the `note`.
11. Print the paper body verbatim (the markdown after the frontmatter).
12. **Trailing status line** (v0.2 + v0.3):
    ```
    <N> examines resolved (<M> missing); <P> perspectives; <E_c>/<E_p> experiments completed/planned;
    <O> outcomes; <B> proposed builds; type=<type>; status=<status>;
    verdict=<yes|no|n/a>; applicability=<sum>; revisions=<N>; measured_metrics=<sum>
    ```
    - `verdict` is `yes` if `verdict.one_line` populated, `no` if status=implemented + missing, `n/a` otherwise (draft/reviewed/retracted).
    - `applicability` is the count of entries across all four sub-lists; `0` when applicability block omitted entirely.
    - `revisions` is `len(premise_history)`.
    - `measured_metrics` is `sum(len(e.measured) for e in experiments)`.
    - The v0.3 fields are appended only when at least one v0.3 field is populated; pure v0.2 papers see the original three-clause line.

## Flags

- `--raw`: skip all expansion, print file as-is.

## Rules

- Read-only.
- Never modify the paper.
- Never fetch remote. Missing refs are surfaced, not auto-repaired.
- **Retracted banner**: if `status=retracted`, prepend the output with a warning block showing `retraction_reason`. The body is still rendered (retracted papers are historical record, not deleted).

## v0.2 behaviors worth flagging

- If `outcomes[].kind == produced_example`, resolve against `example/<ref>/README.md` (or `manifest.json`) and print the one-line description. This works because paper #2's `built_as` + `outcomes` pattern expects this resolution.
- If a paper has `experiments[]` with mixed statuses (some `completed`, some `planned`), show both so readers see the in-progress work.

## v0.3 behaviors worth flagging

- **Verdict-first ordering**: when `status=implemented` and `verdict.one_line` is populated, the VERDICT banner (step 3) appears immediately after the frontmatter and before EXAMINES. This applies the §15.3 "verdict-first" spirit to the full-paper view — readers see the action-oriented summary before the analytical scaffolding.
- **Empty verdict on implemented paper**: prints `⚠ [verdict missing]` in place of the banner, and the trailing status line shows `verdict=no` so reviewers can flag the paper for `_audit_paper_v03.py`.
- **Premise rewrite trail**: `premise_history[]` is the structured form of what used to be inline `# Rewritten YYYY-MM-DD` YAML comments in v0.2 papers. The PREMISE TRAIL block (step 5) makes the trail readable; the inline comments in v0.3 papers can be retired (see `paper/workflow/parallel-dispatch-breakeven-point` for the canonical pattern).
- **Numeric experiment results**: `experiments[i].measured[]` is the structured form of what used to be free-form result tables. Both representations should match — `measured[]` is grep-able by `_audit_paper_v03.py` and other tools, but the body's IMRaD `## Results` section remains the human-facing rendering.
- **Truncation**: VERDICT banner does NOT truncate `verdict.one_line` (unlike `/hub-find` which caps at 200 chars). Full-paper view assumes the reader has the page; injection contracts compress, full-view doesn't.

## Related

- `/hub-paper-list` — all papers, one row each
- `/hub-paper-verify <slug>` — structural check

## Why exists

A paper's frontmatter carries compact refs (`workflow/safe-bulk-pr-publishing`). Reading the names alone tells a reviewer *what is cited*; expanding them inline tells the reviewer *what each reference actually is*. Same logic extends to `experiments[].built_as`, `proposed_builds[].requires[]`, and `outcomes[].ref` — all of them are useful only when expanded alongside the narrative. That work belongs in the show command, not pushed onto the reader.
