---
description: Extract draft v0.3 verdict / applicability / premise_history blocks from an existing implemented hypothesis paper's body and experiments. Read-only by default; --write commits with author confirmation.
argument-hint: <slug> [--write] [--json]
---

# /hub-paper-extract-verdict $ARGUMENTS

Backfill v0.3 fields (paper-schema-draft.md §15) on an existing `type=hypothesis` `status=implemented` paper that pre-dates the amendment or skipped the fields at compose time. The extractor mines `experiments[].result`, the rewritten `premise.then`, the body's `## Discussion` and "Premise revision" sections, and the `proposed_builds[]` summaries to propose draft `verdict.one_line` / `verdict.rule` / `verdict.belief_revision` / `applicability.*` / `premise_history[]` / `experiments[].measured/refutes/confirms` blocks.

Drafts are author-edited before merge. The command never overwrites populated v0.3 fields without `--force`. With `--write`, the draft is inserted into the paper and `/hub-paper-verify` is run automatically.

## Input resolution

- `<slug>`: locate first match in `~/.claude/skills-hub/remote/paper/**/<slug>/PAPER.md`, then `./.paper-draft/**/<slug>/PAPER.md`. Refuse if not found.
- `--write`: insert the draft fields into the source PAPER.md (with confirmation), then run `/hub-paper-verify <slug>`. Default behavior is print-only.
- `--json`: machine-readable output (for tooling pipelines).
- `--force`: overwrite any v0.3 fields already populated. Default refuses if `verdict.one_line` is non-empty.

## Preconditions

The command refuses with a clear message when:

- `type` ≠ `hypothesis` (survey/position papers don't carry experimental verdicts; v0.3 §15.2 rules 16-18 don't fire on them)
- `status` ∉ {`implemented`, `reviewed`} (the body lacks the post-experiment narrative the extractor mines)
- `experiments[]` is empty OR no entry has `status=completed` (no result to extract from)
- `verdict.one_line` is already populated AND `--force` not passed

## Steps

1. **Read the paper** (read-only):
   - Frontmatter: `name`, `description`, `category`, `premise.if/then`, `examines[]`, `proposed_builds[].summary`, `experiments[*].{name, hypothesis, method, result, supports_premise, observed_at}`, `outcomes[]`, `status`.
   - Body: harvest `## Discussion`, `## Limitations` / `### Limitations` subsection, `### Future work`, the "Premise revision" section if present, the IMRaD `## Results` for tabular numerics.
   - Frontmatter YAML comments (`# Rewritten YYYY-MM-DD`) — the inline rewrite trail to migrate into structured `premise_history[]`.

2. **Extract `verdict.one_line`** (heuristic, ≤200 chars):
   - Read the rewritten `premise.then` for the post-experiment summary statement.
   - Restate as imperative: "If you're about to X, do/don't Y because Z." The action verb comes from `proposed_builds[0].summary` when present, otherwise from the Discussion section's recommendation language.
   - Carry forward the pivotal numeric finding when present (e.g., "if useful_output < 5 files, skip parallel").
   - Print the candidate; mark the source span(s) that informed it.

3. **Extract `verdict.rule.{when, do, threshold}`**:
   - `when`: `premise.if` rephrased as a precondition — "About to <do X> on <context>".
   - `do`: derived from `proposed_builds[0].summary` (the recommended build) or from Discussion's actionable language.
   - `threshold`: scan `experiments[].result` for numeric tokens (`<num> <unit>`, `at least <num>`, "ratio in [a, b]", "≤ N", "exceeds N"). Emit one threshold per pivotal cell. If multiple, prefer the one that aligns with the imperative in `do`.

4. **Extract `verdict.belief_revision.{before_reading, after_reading}`**:
   - `before_reading`: from the "Premise revision" body section's *original* premise (preserved text marked as superseded), OR from the body's "What this paper sets out to test" sub-section, OR reconstructed from `description` (which often retains the pre-experiment framing).
   - `after_reading`: from current rewritten `premise.then` plus the Discussion section's interpretation.
   - Both fields should articulate the *delta* — what the reader thought before vs after. If the two versions are nearly identical, the paper's experiment didn't shift belief much; surface that as a comment.

5. **Extract `applicability.applies_when`** (≥1):
   - Mine `examines[]` for "subject" / "canonical-how-to" roles — those imply "applies when working with X".
   - Mine `experiments[].method` for measurement preconditions ("default weights", "typical agent runners").
   - Mine Discussion for "this applies to..." or "in deployments where..." phrases.
   - Cap at ~5 entries.

6. **Extract `applicability.does_not_apply_when`**:
   - **Pivot**: experiments where `supports_premise` is `no` or `partial` — those cells ARE the does-not-apply conditions. Convert each to a does-not-apply phrase.
   - Mine Limitations subsection for assumptions whose violation invalidates the result.
   - Mine "Counter-Argument" perspective for explicit non-applicability cases.
   - Cap at ~6 entries.

7. **Extract `applicability.invalidated_if_observed`**:
   - Mine `### Future work` subsection for "would refute", "if observed", "would invalidate" phrases.
   - Mine Limitations for "this would not hold if..." constructs.
   - Each entry should be a specific, observable signal. Prefer concrete observables ("agent-runner startup drops to single-digit seconds") over vague trends ("things change").
   - Cap at ~5 entries.

8. **Extract `applicability.decay.{half_life, why}`** (heuristic — author edits expected):
   - Default `half_life`: `12 months` for measurement papers; `6 months for absolute numbers; indefinite for the structural-shape claim` for power-law / structural papers; `indefinite` for definitional/architecture findings.
   - `why`: derived from Limitations + Future Work — what specifically would shift the result. The default is "cost weights / library version / corpus shape change"; the extractor leaves a TODO comment when it can't infer.

9. **Extract `premise_history[]`**:
   - If the body has a "Premise revision" section preserving the original `IF` / `THEN`, emit `[1]` with that text + the date from frontmatter comments (`# Rewritten YYYY-MM-DD`) or from `experiments[0].observed_at`.
   - If the body lacks the preserved original but the rewrite is implied by Provenance (e.g., "premise rewritten YYYY-MM-DD"), reconstruct best-effort and mark with a TODO so the author can refine.
   - `cause`: the experiment name + the specific cell or finding that forced the rewrite. Drawn from `experiments[].result` partial-refutation language.

10. **Extract `experiments[i].measured[]`**:
    - Parse `experiments[i].result` for numeric tokens. For each pivotal cell mentioned, emit a `measured` entry with `metric`, `value`, `unit`, `condition`.
    - Natural cardinality is "pivotal cells + derived metrics" — typically 8-12 entries per experiment (matches the dogfood-batch observation from #1135).
    - Skip filler numbers (sample sizes, dates, equation indices unless central).

11. **Extract `experiments[i].refutes[]` / `confirms[]`**:
    - Parse `experiments[i].hypothesis` for sub-claims (split on `AND`, comma, semicolon).
    - For each sub-claim, classify as `refutes` or `confirms` based on `experiments[i].result` language.
    - When `supports_premise: partial`, expect ≥1 `refutes` and ≥1 `confirms`. When `supports_premise: yes`, expect all `confirms`. When `no`, expect all `refutes`.

12. **Print the draft block**:
    - Default: print the YAML draft to stdout, between markers:
      ```
      ════════════════════════════════════════════════════════════
      DRAFT v0.3 BLOCK FOR <slug>
      Insert between `premise:` and `examines:` in PAPER.md.
      ════════════════════════════════════════════════════════════

      verdict:
        one_line: "..."
        rule:
          when: ...
          do: ...
          threshold: ...
        belief_revision:
          before_reading: ...
          after_reading: ...

      applicability:
        applies_when:
          - ...
        does_not_apply_when:
          - ...
        invalidated_if_observed:
          - ...
        decay:
          half_life: ...
          why: ...

      premise_history:
        - revision: 1
          date: YYYY-MM-DD
          if: <original premise.if>
          then: <original premise.then>
          cause: <experiment + observation that forced rewrite>

      ════════════════════════════════════════════════════════════
      DRAFT EXPERIMENTS[i] AUGMENTATION FOR <slug>
      Append to each experiments[i] block in PAPER.md.
      ════════════════════════════════════════════════════════════

      experiments[0]:
        measured:
          - metric: ...
            value: ...
            unit: ...
            condition: ...
          ...
        refutes:
          - ...
        confirms:
          - ...

      ════════════════════════════════════════════════════════════
      EXTRACTION CONFIDENCE
      ════════════════════════════════════════════════════════════
      Field                        confidence  source
      verdict.one_line             high         premise.then + proposed_builds[0]
      verdict.rule.threshold       medium       experiments[0].result numeric scan
      applicability.applies_when   high         examines[] + experiments[0].method
      applicability.does_not_apply_when  high   supports_premise=partial cells
      applicability.decay.half_life  low        author edit recommended
      premise_history[0]           high         body "Premise revision" section
      experiments[0].measured      high         experiments[0].result table
      experiments[0].refutes/confirms  medium   hypothesis sub-claim split
      ```
    - Always print the per-field confidence + source line so the author knows where to focus review effort.
    - With `--json`: emit a structured object: `{frontmatter_block: {...}, experiments_augmentation: [{...}], confidence: {field: {level, source}}}`.

13. **`--write` mode** — confirmation gate:
    - Print the draft (step 12).
    - Prompt: `Insert into <path>? [y/N]`.
    - On `y`: insert the YAML between `premise:` and `examines:` (preserving frontmatter formatting), append the experiments-augmentation under each matching experiment, then run `/hub-paper-verify <slug>`.
    - On `n`: print location of the draft saved to `.paper-draft/<category>/<slug>/v03-extraction.draft.yml` for further iteration.

## Heuristic boundaries

The extractor is **heuristic**, not authoritative. It reads natural-language body sections and converts them to structured form. Expected error modes:

- **Over-confident `verdict.one_line`**: when `premise.then` was rewritten loosely, the extractor may produce a verdict that's structurally clean but semantically off. Author edits expected.
- **Missing `applicability.invalidated_if_observed`**: papers without a clear Future Work section may yield zero entries. Author should add at least one signal.
- **Numeric-token threshold confusion**: when `experiments[].result` mentions multiple numbers (e.g., 70%, 80%, 90%, 5 files), the extractor's threshold pick may be wrong. Confidence flagged as `medium`.
- **`decay.half_life`**: always low confidence. Cost-weight stability and library-version dependency are author judgment calls.

The confidence column in step 12 is the extractor's best signal of where review attention is needed.

## Rules

- Read-only by default. `--write` requires explicit confirmation per author edit, never silent overwrite.
- Refuse to overwrite populated `verdict.one_line` without `--force` (per the precondition check).
- Never modify body content or other frontmatter fields. Only the v0.3 fields are inserted/updated.
- Extraction quality scales with the source paper's IMRaD compliance. Run `_audit_paper_imrad.py` first if quality is low.
- This command is for backfilling existing implemented papers. New paper authoring should use `/hub-paper-compose` (which generates v0.3 fields by default at compose time per #1132 schema).

## Use cases

- **Maintenance window**: a paper pre-dates v0.3 (or skipped fields). Run `/hub-paper-extract-verdict <slug> --write` to backfill. Confidence column directs author review.
- **Pre-publish gate recovery**: `/hub-paper-verify` FAILed on rules 16-18 for an implemented paper. Run this command to generate the missing fields from the existing body.
- **Audit follow-up**: `_audit_paper_v03.py` shows adoption < 100%. The flagged papers are candidates for extraction.
- **Schema drift fix**: `--force` re-extracts even on populated papers, useful when v0.3 itself revises (v0.3.1+) and existing fields need rewriting.

## Example

```
/hub-paper-extract-verdict feature-flag-flap-prevention-policies

▶ paper: paper/arch/feature-flag-flap-prevention-policies/PAPER.md
▶ type=hypothesis status=implemented (preconditions met)
▶ verdict.one_line: not yet populated → extracting…

════════════════════════════════════════════════════════════
DRAFT v0.3 BLOCK FOR feature-flag-flap-prevention-policies
Insert between `premise:` and `examines:` in PAPER.md.
════════════════════════════════════════════════════════════

verdict:
  one_line: "Hysteresis ratio doesn't fix flap on spiky workloads (invariant at 1.21/h across [1.2x, 3.0x]); apply 1.5-2.0x only on borderline-noise (bursty/drifting) — for spiky, use debouncing."
  rule:
    when: "About to tune circuit-breaker hysteresis on a feature flag with an error-rate trip threshold"
    do:   "Classify workload first (smooth / spiky / bursty / drifting). Apply hysteresis ratio 1.5-2.0x for bursty/drifting. For spiky, switch to debouncing instead."
    threshold: "ratio in [1.5, 2.0] for bursty/drifting; debounce_N >= 2 for spiky"
  belief_revision:
    before_reading: "Hysteresis ratio 1.5-2x is the universal optimum across all workload classes."
    after_reading:  "Hysteresis is workload-conditional — fixes flap on borderline-noise, not on distinct spikes. Trip-detection delay is a debouncing concern, not hysteresis."

applicability:
  applies_when:
    - "Feature flag has a circuit breaker tied to error rate"
    - "Workload class identifiable as smooth / spiky / bursty / drifting"
    - "Single-sample trip is acceptable (otherwise debouncing dominates)"
  does_not_apply_when:
    - "Workload is spiky — hysteresis flap rate invariant at 1.21/h"
    - "Trip-detection delay is the primary failure cost — use debouncing"
    - "Adversarial workloads (alternating just-above-H / just-below-L)"
  invalidated_if_observed:
    - "Real-incident replay shows flap rate >2x simulator prediction"
    - "Debounce-extended 2D experiment shows (R=1.5, debounce_N=3) does NOT outperform (R=2.0, debounce_N=1)"
    - "Sampling rate finer than 1/min reveals hysteresis effects on spiky"
  decay:
    half_life: "indefinite for bursty/drifting result; ~12 months for spiky-invariant claim"
    why:       "Cost model is workload-shape-driven; survives breaker library changes. Spiky claim fragile to sampling-rate change."

premise_history:
  - revision: 1
    date: 2026-04-25
    if:   "A feature flag has a circuit breaker tied to error rate"
    then: "Hysteresis ratio 1.5-2x is the universal optimum: ≤1 flap/hour AND ≤10 min trip-detection delay across all workload classes."
    cause: "experiments[0] (hysteresis-ratio-tradeoff). 20-cell Monte Carlo found spiky workload flap invariant at 1.21/h regardless of ratio, refuting the universal-optimum claim. Trip-detection delay 0 min in every cell — hysteresis doesn't affect detection, only debouncing does."

════════════════════════════════════════════════════════════
EXTRACTION CONFIDENCE
════════════════════════════════════════════════════════════
Field                              confidence  source
verdict.one_line                   high         premise.then + proposed_builds[0].summary
verdict.rule.threshold             high         experiments[0].result table
applicability.applies_when         high         premise.if + experiments[0].method
applicability.does_not_apply_when  high         supports_premise=partial spiky cells
applicability.decay.half_life      medium       Limitations + Future Work
premise_history[0]                 high         body "Premise revision" + Provenance
experiments[0].measured            high         experiments[0].result table (20 cells)
experiments[0].refutes/confirms    medium       hypothesis sub-claim split

(use --write to insert into PAPER.md and run /hub-paper-verify)
```

## Why exists

Three v0.3 commands now exist that consume the v0.3 fields (`/hub-find`, `/hub-paper-show`, `/hub-paper-verify`). One v0.3 command produces them at compose time (`/hub-paper-compose` v0.3+). None backfilled them onto existing papers. Until this command, every backfill required manual extraction from a 200-line IMRaD body — exactly the work the schema is supposed to make machine-readable. The extractor surfaces what's already in the paper into the structured form the rest of the pipeline now expects.

After this PR, the v0.3 wiring is complete: papers can be composed with v0.3, verified against v0.3, surfaced through v0.3, and **backfilled into v0.3** — no remaining manual gap.

## Related

- `/hub-paper-compose` — author a new paper draft from scratch (v0.3+ generates the fields)
- `/hub-paper-verify` — gate publish on v0.3 §15.2 rules 16-18
- `/hub-paper-show` — render the v0.3 blocks prominently in full-paper view
- `_audit_paper_v03.py` — informational corpus-wide v0.3 compliance report
