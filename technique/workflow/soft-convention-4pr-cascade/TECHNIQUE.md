---
version: 0.2.0-draft
name: soft-convention-4pr-cascade
description: "Roll out a soft convention via 4 sequential PRs — schema amendment, informational audit, dogfood, hard enforcement"
category: workflow
tags:
  - soft-convention
  - schema-rollout
  - audit-fleet
  - dogfood
  - self-corrective-gate
  - meta-workflow

composes:
  - kind: knowledge
    ref: arch/additive-registry-schema-versioning
    version: "*"
    role: schema-evolution-baseline
  - kind: knowledge
    ref: workflow/pre-push-discipline-test-lint-typecheck
    version: "*"
    role: gate-baseline
  - kind: skill
    ref: production/gate-check
    version: "*"
    role: verdict-shape
  - kind: knowledge
    ref: cli/legacy-vs-explicit-subcommand-migration
    version: "*"
    role: deprecation-pattern
  - kind: knowledge
    ref: pitfall/yaml-mid-string-colon-strict-parser-mismatch
    version: "*"
    role: audit-value-evidence

recipe:
  one_line: "Cascade a soft convention through 4 sequential PRs — schema amendment, informational audit, dogfood on existing entries, hard enforcement promotion. Each PR small and independently mergeable."
  preconditions:
    - "Convention adds OPTIONAL fields/rules — existing entries remain valid without migration"
    - "Convention has machine-checkable lint signal (regex, schema validation, or counted metric)"
    - "Adoption is measurable; a self-corrective retraction threshold can be defined (e.g., < 30% past 90 days)"
  anti_conditions:
    - "Convention is a breaking change — additive cascade doesn't apply, use a versioned migration"
    - "No measurable adoption signal — audit step + self-corrective gate cannot run"
    - "One-shot fix to a single file — overhead of 4 PRs exceeds value; just edit the file"
    - "Convention requires human judgment, not mechanical lint — enforcement step has nothing to gate on"
  failure_modes:
    - signal: "PR 4 (enforcement) merges before PR 3 (dogfood) — existing entries start failing lint, blocking unrelated work"
      atom_ref: "knowledge:workflow/pre-push-discipline-test-lint-typecheck"
      remediation: "Strict ordering — PR 3 must clear baseline above target threshold before PR 4 lands. Use a draft-PR queue if PRs land in parallel."
    - signal: "PR 2 (audit) reports zero offenders on first run — convention is aspirational, not real"
      atom_ref: "knowledge:pitfall/yaml-mid-string-colon-strict-parser-mismatch"
      remediation: "If audit finds no real cases, the convention is solving a hypothetical problem. Either find real cases via wider scan, or retract the convention before PR 3."
    - signal: "Adoption stalls below self-corrective threshold past grace period — convention is candidate for retraction"
      atom_ref: "knowledge:cli/legacy-vs-explicit-subcommand-migration"
      remediation: "Schedule a retraction PR with deprecation rationale rather than letting the convention silently die. Document why it didn't take."
  assembly_order:
    - phase: schema
      uses: schema-evolution-baseline
      branches:
        - condition: "additive change (OPTIONAL fields)"
          next: audit
        - condition: "breaking change required"
          next: done
    - phase: audit
      uses: verdict-shape
      branches:
        - condition: "baseline reports actual offenders > 0"
          next: dogfood
        - condition: "baseline reports zero offenders"
          next: done
    - phase: dogfood
      uses: verdict-shape
      branches:
        - condition: "adoption clears self-corrective threshold"
          next: enforcement
        - condition: "adoption stalls below threshold"
          next: deprecate
    - phase: enforcement
      uses: gate-baseline
    - phase: deprecate
      uses: deprecation-pattern

binding: loose

verify:
  - "every composes[].ref is installed in the hub"
  - "every composes[].version range intersects the installed version"
  - "the audit phase ships before any dogfood work — the dogfood needs the baseline measurement"
  - "the enforcement PR lands AFTER dogfood lifts adoption above the self-corrective threshold"
---

# Soft Convention 4-PR Cascade

> A meta-workflow technique for rolling out optional/soft conventions (schema fields, lint rules, style conventions) via 4 sequential PRs. Each PR has a specific role and is independently mergeable; the cascade prevents the common failure mode of "enforcement merged before existing entries comply, breaking unrelated work."

<!-- references-section:begin -->
## Composes

**knowledge — `arch/additive-registry-schema-versioning`**  _(version: `*`)_
schema-evolution-baseline

**knowledge — `workflow/pre-push-discipline-test-lint-typecheck`**  _(version: `*`)_
gate-baseline

**skill — `production/gate-check`**  _(version: `*`)_
verdict-shape

**knowledge — `cli/legacy-vs-explicit-subcommand-migration`**  _(version: `*`)_
deprecation-pattern

**knowledge — `pitfall/yaml-mid-string-colon-strict-parser-mismatch`**  _(version: `*`)_
audit-value-evidence

<!-- references-section:end -->

## When to use

- Introducing a new optional field, lint rule, or style convention to a corpus that has existing entries
- The convention is **soft** initially (advisory, not blocking) — hard enforcement comes only after adoption clears a threshold
- Adoption is measurable (existing entries can be scanned for compliance count)
- A self-corrective gate is acceptable — if adoption stalls, the convention can be retracted rather than forced

## When NOT to use

- Breaking changes that require all existing entries to migrate immediately — use a versioned migration plan instead, not a cascade
- One-shot fixes that touch a single file — 4 PRs of overhead is wasted
- Conventions that require human judgment per entry (e.g., "good naming") — there's nothing for the audit to gate on
- Time-critical changes where waiting for adoption is unacceptable — go straight to enforcement and accept the breakage cost

## Phase sequence

```
[1] Schema     → Add OPTIONAL fields/rules to spec; document migration plan;
                 explicitly state self-corrective retraction threshold
[2] Audit      → Pure-regex / parser-independent audit script; wire into
                 precheck; baseline measurement; informational only (exit 0)
[3] Dogfood    → Populate the new fields on N existing entries until adoption
                 clears the self-corrective threshold; validates field design
[4] Enforce    → Promote audit's required rules from advisory WARN to FAIL;
                 publish-blocker activated; documents in /hub-paper-verify or
                 equivalent gate
```

### [1] Schema

The first PR adds the convention to the schema document (e.g., paper-schema-draft.md, technique-schema-draft.md). All new fields are OPTIONAL initially; existing entries continue to verify under prior rules.

The PR must also state:
- **What gets enforced eventually** — the lint rule(s) that PR 4 will promote
- **Self-corrective threshold** — the adoption percentage past which the convention is retained vs the threshold below which it's retracted (e.g., < 30% past 90 days = retract)
- **Migration plan** — how existing entries get backfilled (PR 3's dogfood scope)

No code change in this PR. Pure spec.

### [2] Audit

The second PR adds the informational audit. Critical posture choices:

- **Parser-independent** if convention is parse-related — use regex scan rather than the same parser the authors use locally. PyYAML accepting bad YAML is the canonical case (see `pitfall/yaml-mid-string-colon-strict-parser-mismatch`).
- **Exit 0 always** — informational audits never block precheck. They report compliance percentage and per-entry findings.
- **Wired into `precheck.py`** so the audit runs automatically on every commit/post-merge hook.
- **Baseline measurement** — PR description includes the audit's first-run output. This number is the dogfood scope for PR 3.

Why audit ships before dogfood: dogfood needs a measurable starting point. Without the audit, "we improved adoption" has no denominator.

### [3] Dogfood

The third PR populates the new fields on existing entries until the audit's compliance percentage clears the self-corrective threshold from PR 1.

Two pathways:
- **Greenfield-friendly conventions**: dogfood is small (1-3 entries) just to validate field design. Most adoption happens organically as new entries are authored.
- **Coverage-blocking conventions**: dogfood is corpus-wide (10+ entries). If the audit catches latent offenders not visible to authors, this PR fixes them all.

If adoption stalls below threshold during dogfood — the convention's value isn't matching its cost. Stop, reconsider whether the convention should ship.

Field-design validation is a side effect: authoring against a real entry surfaces design flaws (a field too short, a sub-field that doesn't fit any real example, etc.). Discoveries here feed back to PR 1 if the schema needs revision before PR 4.

### [4] Enforce

The fourth PR promotes the audit's required rules from advisory WARN to lint FAIL. This is the publish-blocker activation:

- `/hub-paper-verify` (or equivalent) gains the new rule set
- Pre-existing entries (still flagged by some advisories) are documented as exempt or grandfathered
- New entries cannot be authored without compliance

Crucially, this PR ships AFTER PR 3 lifts adoption above threshold. If you ship PR 4 first, all existing non-compliant entries fail lint, and unrelated PRs that touch those entries get blocked — unintended cross-cutting breakage.

### [Optional] Deprecate phase

If PR 3's dogfood reveals adoption stalls below threshold — the convention isn't earning its keep — the cascade ends here. A deprecation PR follows the `legacy-vs-explicit-subcommand-migration` pattern: warning emitted, schema marked deprecated, eventually retracted. Document why it didn't take so future conventions don't repeat the mistake.

## Glue summary

| Added element | Where |
|---|---|
| Self-corrective retraction threshold defined upfront | Phase 1 (schema) |
| Parser-independent audit (catches what local parser misses) | Phase 2 |
| Baseline measurement before dogfood begins | Phase 2 → 3 transition |
| Strict ordering (enforce after dogfood) prevents cross-cutting breakage | Phase 3 → 4 transition |
| Optional deprecation phase as exit ramp | Phase 3 → deprecate branch |

## Failure modes (mapped to atoms)

| Failure signal | Caused by | Remediation |
|---|---|---|
| Enforcement (PR 4) lands before dogfood (PR 3) clears threshold | `pre-push-discipline-test-lint-typecheck` | Block PR 4 review until PR 3 audit shows clear baseline |
| Audit reports zero offenders on first run | `yaml-mid-string-colon-strict-parser-mismatch` (canonical "audit found real cases" example) | Convention is solving a hypothetical problem — wider scan or retract before PR 3 |
| Adoption stalls during dogfood | `legacy-vs-explicit-subcommand-migration` (deprecation pattern) | Ship PR 4 as deprecation-with-rationale rather than enforcement |

## When the technique is succeeding (success signals)

- Each PR is small (typically <100 LOC) and independently reviewable
- The audit's first-run baseline matches the dogfood's expected scope
- After PR 3 merges, adoption metric crosses the self-corrective threshold cleanly
- PR 4 enforcement adds zero new lint failures across the corpus (because PR 3 cleared them)
- A subsequent convention's cascade reuses this technique's phase ordering — pattern is repeatable

## Known limitations

- Coordination cost — 4 sequential PRs across days/weeks. For trivial conventions (e.g., one-character formatting rule), the overhead exceeds value.
- Self-corrective threshold is an estimate. The 30%/60%/90-day thresholds I've used (paper §15.6, §16.6, technique §13.6) are heuristics based on a small N of conventions. Better calibration requires more cascade history.
- Phase ordering assumes the audit catches what the author missed. If the audit and the convention come from the same author, the audit may have the same blind spots — multi-author authoring is the safer pattern.
- Deprecation phase isn't always reached cleanly. If adoption stalls without crossing back below threshold (e.g., stuck at 25% with no movement), the decision to retract is judgment-based, not mechanical.

## Why exists

Three independent rollouts in one skills-hub session (paper schema v0.3, technique schema v0.2, paper schema §16 brevity convention) all followed the same pattern. Authoring each cascade required re-discovering the phase ordering — schema first or audit first? When does dogfood happen? When does enforcement land? Each cascade re-derived the answer from scratch.

This technique freezes the ordering and the threshold-gating logic so the next convention cascade reuses the validated sequence rather than re-discovering it. The 4-PR pattern is the *minimum-coordination* shape that prevents the common failure modes (enforcement-before-dogfood breakage, audit-without-baseline directionlessness, hypothetical-not-real conventions).
