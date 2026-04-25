---
description: Validate a paper against schema v0.2 + v0.3 — structure only (premise, examines, perspectives, description, name, status, type, experiments, requires, verdict, applicability, premise_history). No substance checks.
argument-hint: <slug> | --all [--strict]
---

# /hub-paper-verify $ARGUMENTS

Run schema v0.2 §6 + v0.3 §15.2 rules against one paper (or all). **Structure-only by design** — this command does NOT evaluate the correctness of the premise, the accuracy of the perspectives, the truth of the external_refs, or whether the verdict actually follows from the experiments. Lint enforces presence; reviewer judges substance.

## Input resolution

- `<slug>`: locate first match in `./.paper-draft/**/<slug>/PAPER.md`, then `~/.claude/papers/**/<slug>/PAPER.md`
- `--all`: verify every paper in both locations

## Checks

### v0.1 rules (rules 1-8)

1. **Frontmatter well-formed**: YAML parses; required keys: `version`, `name`, `description`, `category`, `premise`, `examines`, `perspectives`, `status`.
2. **Premise non-empty**: both `premise.if` and `premise.then` present, ≥1 char after strip.
3. **Examines non-empty + resolve**: `examines[]` length ≥1; every `ref` resolves:
   - `kind: skill` → `skills/<ref>/SKILL.md`
   - `kind: knowledge` → `knowledge/<ref>.md`
   - `kind: technique` → `technique/<ref>/TECHNIQUE.md`
   - `kind: paper` → `paper/<ref>/PAPER.md` (v0.2.1: paper-to-paper citations are first-class; the original v0 ban was lifted because citations are flat references, not compositional nesting)
4. **Perspectives ≥ 2**: WARN at 1 (upgraded to FAIL under `--strict`)
5. **Description length**: ≤120 chars (WARN if exceeded unless `--strict`)
6. **Name matches folder**: `name` == containing directory name
7. **Status enum**: `status` ∈ {`draft`, `reviewed`, `implemented`, `retracted`}
8. (No check on `external_refs` URL reachability — too flaky)

### v0.2 additions (rules 9-15)

9. **Type enum**: `type` ∈ {`hypothesis`, `survey`, `position`}. Missing `type` defaults to `hypothesis` (backward-compat).
10. **Implemented-status proof**: for `type=hypothesis`, `status=implemented` requires at least one `experiments[]` entry with `status=completed`, non-null `result`, and `supports_premise` set to yes/no/partial. `type=survey` and `type=position` are exempt.
11. **Retraction requires reason**: `status=retracted` requires non-null `retraction_reason`.
12. **Requires refs resolve**: every `proposed_builds[i].requires[j].ref` resolves on disk (kind restricted to skill/knowledge/technique — no paper nesting).
13. **Non-triviality WARN**: emitted when any `proposed_builds[i].requires[]` is empty or contains a single ref that also appears in `examines[]` unchanged. Includes the build slug.
14. **Built-as resolves**: `experiments[i].built_as` if present must resolve to `example/<ref>/`. Missing build with `status=completed` is a WARN.
15. **Completed experiment completeness**: `experiments[i].status=completed` requires `result`, `supports_premise`, and `observed_at` all non-null.

### v0.3 additions (rules 16-18 required + a-d advisory)

The v0.3 amendment (paper-schema-draft.md §15) adds optional frontmatter fields for LLM-consumption injection. Rules 16-18 fire **only when** `type=hypothesis` AND `status=implemented` — survey/position/draft/reviewed papers are exempt.

16. **Verdict line populated**: `verdict.one_line` non-empty (≥1 char after strip). The action-oriented summary surfaced by `/hub-find` and `/hub-paper-show` per §15.3.
17. **Decision rule populated**: `verdict.rule.do` non-empty. The machine-checkable action a future PR-lint can grep against.
18. **Applicability bounds set**: `applicability.applies_when` length ≥1. Without applicability bounds, an implemented verdict over-applies — at least one positive precondition must be stated.

Advisory rules (a-d) — WARN, never FAIL on their own; `--strict` upgrades to FAIL like other v0.2 advisories. They fire across all paper statuses but only when the trigger condition is met:

- **a. threshold-on-numeric-result**: `verdict.rule.threshold` empty when `status=implemented` and any completed experiment's `result` contains numeric tokens. Likely a missed extraction.
- **b. partial-without-rewrite-log**: `premise_history` empty when any completed experiment has `supports_premise: partial`. Partial verdicts almost always imply a premise rewrite — capture the trail.
- **c. partial-without-does-not-apply**: `applicability.does_not_apply_when` empty when any completed experiment has `supports_premise` in {`no`, `partial`}. The "no/partial" cells are the does-not-apply conditions.
- **d. rewrites-without-before-reading**: `verdict.belief_revision.before_reading` empty when `premise_history` length ≥2. The original assumption that drove revision 1 should be captured.

**v0.3 §15.6 grace period**: rules 16-18 are FAIL on new implemented papers immediately. The amendment was merged 2026-04-26; all 3 pre-existing implemented papers were dogfooded in #1133/#1135 (parallel-dispatch, feature-flag-flap, technique-layer-roi). No backward-compat carve-out is needed because the three pre-existing in-scope papers are already compliant. If a future maintenance window finds an implemented paper that pre-dates v0.3 and lacks the fields, downgrade temporarily via `--no-v03` (not yet implemented; add when needed).

### v0.2.1 (opportunistic)

- `outcomes[].kind` accepts `produced_example` alongside the core enum (formalized via schema update; older consumers just ignore unknown kinds).
- Duplicate top-level frontmatter keys FAIL (global rule inherited from `_lint_frontmatter.py`).

### What is NOT verified (intentionally)

- `premise` content correctness
- `perspectives[].summary` accuracy
- `external_refs[]` URL reachability, quality, or relevance
- Whether an experiment's `result` supports its claim (reviewer job)
- Whether `outcomes[]` were genuinely caused by the paper (authors can overclaim)

## Output format

Per paper:
```
PAPER: <category>/<slug>  (v<version>, type=<type>, status=<status>)
  [PASS]  frontmatter well-formed
  [PASS]  premise.if/then non-empty
  [PASS]  examines[0] workflow/safe-bulk-pr-publishing → technique/workflow/...
  [PASS]  perspectives: 4 (≥2 required)
  [PASS]  type=hypothesis
  [WARN]  proposed_builds[2].requires is empty — non-triviality guard
  [PASS]  experiments[0].status=completed, result non-null, supports_premise=partial, observed_at=2026-04-24
  [PASS]  status=implemented (hypothesis type + 1 completed experiment)
  [PASS]  v0.3 rule 16: verdict.one_line populated (182 chars)
  [PASS]  v0.3 rule 17: verdict.rule.do populated
  [PASS]  v0.3 rule 18: applicability.applies_when (3 entries)
  [WARN]  v0.3 advisory b: premise_history empty but supports_premise=partial — capture the rewrite
RESULT: PASS (2 warnings)
```

A v0.3-compliant implemented hypothesis paper produces 3 PASS lines for rules 16-18 plus 0-4 advisory entries depending on populated fields. A non-compliant one shows `[FAIL]` lines and exits non-zero.

With `--all`, end with aggregate: `<K> papers verified: <pass> pass, <warn> warn, <fail> fail`.

## Exit behavior

- Any `FAIL` → overall failure
- `WARN` only → pass with advisory
- `--strict` upgrades all `WARN` to `FAIL`

## Falsifiability advisory (separate, non-gating)

`/hub-paper-verify` itself stays structural — it does not judge whether a `premise.then` is *checkable*. A complementary audit, `_audit_paper_falsifiability.py`, runs three heuristic detectors over each `type: hypothesis` paper's `premise.then`:

- Comparison operators (`≥`, `≤`, `<`, `>`, `=`, `≈`, `~`, `±`) or comparison phrases ('at least', 'exceeds', 'falls below', etc.)
- Numeric thresholds (digit followed by `%`, `percent`, `x`, `σ`, units, `N=`, etc.)
- Functional-form vocabulary (`linearly`, `exponentially`, `power-law`, `saturates`, `crossover`, `inverts`, etc.)

If none fire, the paper is flagged with an advisory WARN — the heuristic's read is "this premise has no measurable predicate the experiment can check; consider rewriting". It is intentionally heuristic; both false positives (papers that are falsifiable but use unusual language) and false negatives (papers with a numeric threshold for a vacuous claim) are possible.

The audit runs automatically via `precheck.py` (post-merge / post-commit hooks) and can be invoked directly:

```
python ~/.claude/skills-hub/remote/bootstrap/tools/_audit_paper_falsifiability.py
python ~/.claude/skills-hub/remote/bootstrap/tools/_audit_paper_falsifiability.py --only-flagged
```

Survey and position papers are exempt by default — their premises are not prediction-shaped. Use `--include-survey-position` to audit them anyway.

## v0.3 compliance audit (separate, non-gating)

`/hub-paper-verify` enforces v0.3 §15.2 rules 16-18 as FAIL on new implemented hypothesis papers. The complementary `_audit_paper_v03.py` reports the **same rules informationally across the entire corpus** plus the §15.6 adoption signal — useful for monitoring drift over time without blocking publish.

Differences:

| Concern | `/hub-paper-verify` | `_audit_paper_v03.py` |
|---|---|---|
| Posture | Gating (FAIL exits non-zero) | Informational (always exits 0) |
| Scope | One paper at a time, or `--all` | Always full corpus |
| Adoption % | Not reported | Reports `adoption_pct_implemented_hypothesis` |
| §15.6 retraction signal | Not reported | Warns when adoption < 30 % past 2026-07-26 |
| When to use | Pre-publish gate, draft author check | Periodic health monitor, retraction-gate decisioning |

Run the audit directly:
```
python ~/.claude/skills-hub/remote/bootstrap/tools/_audit_paper_v03.py
python ~/.claude/skills-hub/remote/bootstrap/tools/_audit_paper_v03.py --only-flagged
python ~/.claude/skills-hub/remote/bootstrap/tools/_audit_paper_v03.py --json
```

It also runs automatically via `precheck.py` after `paper-imrad-audit`.

## Rules

- Read-only. No mutation.
- Does NOT fetch remote. Assumes `~/.claude/skills-hub/remote/` is current.
- Never auto-fix. Gatekeeper only.

## Why exists

The paper schema deliberately avoids substance verification so exploratory content survives. But structure still matters — a paper with no premise, one perspective, or unresolved citations doesn't meet the definition. This command enforces that floor without rising above it.
