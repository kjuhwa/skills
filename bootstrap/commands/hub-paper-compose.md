---
description: Interactively compose a new paper draft (premise + examines + perspectives + v0.2 experiments/outcomes/requires), then verify structure against the schema
argument-hint: <slug> [--category <cat>] [--type hypothesis|survey|position] [--from <existing-slug>]
---

# /hub-paper-compose $ARGUMENTS

Authoring workflow for the `paper/` exploration layer. Produces `.paper-draft/<category>/<slug>/PAPER.md` with a premise-first scaffold covering all v0.2 frontmatter fields, then runs `/hub-paper-verify` to confirm structural rules pass.

## Input

- **`<slug>`** (required): kebab-case, unique within `.paper-draft/` AND `~/.claude/papers/`.
- `--category <cat>`: one of `CATEGORIES.md` values. Ask if omitted.
- `--type hypothesis|survey|position`: default `hypothesis`. `survey` and `position` are exempt from the v0.2 rule that `status=implemented` requires at least one completed experiment.
- `--from <existing-slug>`: clone frontmatter + examines of an existing paper as starting point.

## Steps

1. **Validate slug**
   - Fail if `.paper-draft/**/<slug>/` or `~/.claude/papers/**/<slug>/` exists.
   - Fail if slug doesn't match `^[a-z][a-z0-9-]*$`.

2. **Premise first** (before anything else — premise IS the paper)
   - AskUserQuestion: `premise.if` — "IF condition, single sentence: ..."
   - AskUserQuestion: `premise.then` — "THEN predicted outcome, single sentence: ..."
   - Warn if either is empty or < 20 chars; confirm continue.

2.5. **Shape category prompt** (per paper #1188 verdict rule)

   AskUserQuestion: "What primary shape claim does this paper make? Pick from:
   - cost-displacement crossover **(NOTE: per #1188 verdict, this is the corpus default-bias to resist; use only if the technique's actual shape is genuinely crossover)**
   - threshold-cliff
   - log-search
   - hysteresis
   - convergence
   - necessity
   - pareto distribution
   - self-improvement (meta-corpus)
   - cross-domain universality (meta-shape)
   - saturation-without-crossover
   - other (specify)"

   - **If cost-displacement chosen**: AskUserQuestion: "Why cost-displacement? Per #1188, default to the technique's ACTUAL shape, not crossover lens. Justify in 1-2 sentences."
   - Capture chosen shape; will be referenced in step 5.5 for cluster check and step 12 for write.

3. **Paper type**
   - If `--type` not provided, ask:
     - `hypothesis` — claims something; must run experiments to reach `status=implemented` (default, most papers)
     - `survey`     — reviews corpus patterns; experiments optional but `outcomes[]` still expected
     - `position`   — argues a stance; lowest trust weight, no data obligation

4. **Frontmatter metadata**
   - `description` (≤120 chars — remind user)
   - `category` from CATEGORIES.md picker
   - `tags` comma-separated; dedupe

5. **Pick examines[]** (at least one required)
   - Loop: "search for atom/technique to cite, or `done`"
   - Delegate to `/hub-find --kind skill|knowledge|technique <query>`
   - Capture `ref` as kind-root-relative physical path; verify file exists
   - Reject `kind: paper` (v0 nesting ban)
   - Prompt for `role` (free-text)

5.5. **Cluster context check** (per paper #1205 verdict rule — N=3 saturation)

   - Run `bootstrap/tools/_audit_paper_shape_claim.py --json` (from #1222) to tally existing papers in the selected shape category
   - Report: "Shape `<chosen>` currently has **N papers** in the corpus."
   - **If N == 0**: this is the 1st paper (single, opens new shape). No additional prompt.
   - **If N == 1**: this is the 2nd paper (cluster forming). AskUserQuestion: "What sub-question does this paper cover (existence / calibration / variant)?"
   - **If N == 2**: this is the 3rd paper (completes 3-paper cluster). AskUserQuestion: "What sub-question does this paper close (existence / calibration / variant)?"
   - **If N == 3**: WARN — "Shape `<chosen>` has reached the N=3 saturation point per paper #1205. Adding a 4th paper requires explicit distinct sub-question justification (else it is corpus padding)."
     - AskUserQuestion: "What distinct sub-question does this paper cover that the existing 3 don't? (e.g., variant within variant, cross-tool, multi-author replication, durability past observation)"
     - **Block authoring if justification is empty or matches an existing sub-question** — author must either rephrase or pick a different shape.
   - **If N >= 4**: STRONG WARN — "Shape already past saturation. Confirm justification is genuinely distinct from prior 4+ papers."

6. **Write perspectives[]** (≥2 required)
   - Loop: `name` + `summary` (1-2 lines)
   - Warn at 1; require at 0

7. **Optional external_refs[]**
   - Ask: "run `/hub-research` to pull external citations?"
   - If yes, the research skill populates; if no, leave empty (tagged `internal-only` in list view)

8. **proposed_builds[] with requires[]** (v0.2 non-triviality gate)
   - Loop: `slug`, `summary` (≥60 chars), `scope` (poc/demo/production)
   - For each build, **require** `requires[]` entries — ≥1 recommended:
     - For each entry: `kind` (skill/knowledge/technique), `ref` (verified on disk), `role`
     - If `requires` is empty, WARN: "this build doesn't depend on any corpus atom — is the paper really needed for it?"
   - Justification prompt if author insists on empty `requires`

9. **experiments[]** (optional but encouraged for `type=hypothesis`)
   - For each planned experiment:
     - `name` (kebab-case label)
     - `hypothesis` (sub-claim being tested, narrower than premise)
     - `method` (how to test — build X, measure Y, N samples)
     - `status: planned` (initial value)
     - Optional: `built_as` (example/<ref> if shipping will be paired)
     - `result: null`, `supports_premise: null`, `observed_at: null` (filled when completed)
   - A `type=hypothesis` paper with no planned experiments gets a WARN: "this paper cannot reach status=implemented without a completed experiment"

10. **outcomes[]** (usually empty at compose time)
    - Typically empty at draft. Populated later when proposed_builds ship or experiments complete.
    - Allowed values: `produced_skill | produced_knowledge | produced_technique | produced_pitfall | produced_example | updated_skill | updated_knowledge | updated_technique`

11. **status** — default `draft`. `retraction_reason` stays null.

11.5. **Adherence checklist** (per paper #1200 verdict rule)

   Before writing, confirm the bias-correction discipline is followed. Show 4 explicit checkboxes; require all 4 to be ticked or have explicit justification:

   - [ ] **Checked the technique's actual shape claim BEFORE writing premise** (#1188 rule)
   - [ ] **Picked shape from the catalog**, not by default-lens
   - [ ] **Cluster position justified** (4+ papers in shape category requires distinct sub-question per #1205)
   - [ ] **PR description will reference this paper's worked-example index** (paper #N of bias-correction sequence; auditor in #1222 reports the running count)

   - If any checkbox is unticked: print rationale prompt and either tick or proceed with WARN (logged to draft frontmatter as `compose_adherence_unticked: ["..."]`)

12. **Write the file** to `.paper-draft/<category>/<slug>/PAPER.md` with v0.2 frontmatter + body scaffold:
    ```
    # <Title>

    ## Introduction
    Restate premise.if/then in narrative form.
    Cite examines[] (the auto-injected ## References (examines) block sits here).
    Note prior work — external_refs[], related papers, RFCs.
    End with a one-sentence statement of what the paper sets out to test.

    ## Methods
    (hypothesis papers only — survey/position papers omit this section)
    Restate experiments[i].method in narrative form, reproducible.

    ## Results
    (hypothesis papers only)
    Report experiments[i].result verbatim or expanded.
    For status=draft, write `(pending)`.

    ## Discussion
    Interpret results through perspectives[].
    State supports_premise verdict + premise rewrite if any.
    Limitations subsection (replaces old `## Limitations`).
    Future Work subsection (replaces old `## Open Questions`).

    ## References
    Auto-injected ## Build dependencies block lands here.
    Numbered list of external_refs[].

    ## Provenance
    Authoring date, batch, loop-closure history, premise rewrites.
    ```

    Body structure follows IMRaD per `docs/rfc/paper-schema-draft.md` §5. Compliance
    is **advisory** (audited by `_audit_paper_imrad.py`), not gating — but new
    papers should ship with IMRaD by default. Section `Methods` and `Results` apply
    only to `type: hypothesis`.

    The `## References (examines)` and `## Build dependencies` sections are NOT
    written by hand — step 13 generates them from the frontmatter. Don't
    duplicate the data manually.

13. **Inject References section** (vertical, narrow-friendly mirror of frontmatter)
    - Run: `python ~/.claude/skills-hub/remote/bootstrap/tools/_inject_references_section.py --only paper --write`
      (or pass the specific PAPER.md path; the tool is idempotent and bounded by
      `<!-- references-section:begin/end -->` markers).
    - Inserts `## References (examines)` and (if any build has requires[])
      `## Build dependencies (proposed_builds)` immediately before `## Perspectives`.

14. **Immediate verification**
    - Run `/hub-paper-verify <slug>`
    - If FAIL, show errors and offer: edit, revert, leave as-is
    - If PASS, print location + next-step hints

## Rules

- **Premise is not optional**. No if/then → no paper.
- `examines[].kind: paper` is allowed (v0.2.1 lifted the v0 ban — citations are flat references, not compositional nesting).
- `proposed_builds[].requires[].kind: paper` is still rejected (compositional path).
- **Never call remote** during compose.
- **Never write to** `~/.claude/papers/` — that's the installed root.
- Authoring and verification are separate passes (step 13).

## v0.2 vs v0.1

- NEW required prompts: `type`, per-build `requires[]`, `experiments[]` planned list
- NEW optional: `outcomes[]` (usually stays empty until experiments complete)
- NEW behavior: `type=hypothesis` paper with no experiments gets a WARN that it cannot reach `status=implemented`

## Why exists

Without compose, every paper is hand-authored from schema memory. Premise-first authoring enforces the main distinction between a paper and other entries — if the author can't state if/then, the content is not paper-shaped. The v0.2 additions (`requires[]`, `experiments[]`) enforce non-triviality and loop-closability at authoring time rather than at verify time.
