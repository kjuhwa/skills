---
tags: [workflow, heuristic, scan, iterative, tuning]
name: heuristic-scan-iterative-tuning
description: When writing a new heuristic scanner over a corpus (dedup, archive, compress, lint), expect the first run to be wrong in predictable ways. Run → inspect false positives → add one guard → re-run. Tighten the spec and the scan script in lockstep so the shipped version reflects real-world calibration, not guessed thresholds.
category: workflow
version: 0.1.0
triggers:
  - writing a corpus-level heuristic scanner
  - false positive triage on a scan
  - detector over-fires or under-fires
  - calibrating dedup/archive/compression thresholds
  - heuristic scan tuning
scope: user
---

# Iterative heuristic-scan tuning

Heuristics over a real corpus are always wrong on the first pass. The working strategy is not "design a perfect heuristic", it's "run the imperfect one, see what it got wrong, add one guard, repeat". Resist the urge to add all guards up front — you don't know which ones the corpus needs until you see what over-fires.

## When to use

- You're writing a new scanner over `~/.claude/skills-hub/remote/` (dedup, archive, compression, lint, duplicate detection, staleness).
- You've just run the scanner and the results look suspicious — too many candidates, or the wrong ones.
- You're about to ship the scanner to other environments and want to ship the calibration *with* the code, not make them re-discover it.

## The loop

### 1. First run: deliberately undefended

Run the scanner with only the core heuristic — no exclusion lists, no source-type guards, no version filters. Use conservative default thresholds. The goal is to see the raw output.

### 2. Inspect the top 3-5 false positives

For each surprising candidate, open the actual entry. Ask:

- Is this entry genuinely the thing the heuristic claims (a stub, a duplicate, verbose prose)?
- If no, what structural property of the entry made it look that way?

Common structural properties that mislead scanners over this corpus:

- `source_type: external-git` — mirror import from gstack/etc; not ours to modify.
- `source.repo: external` or `extracted_by: skills_import_git` — mass-imported knowledge catalog.
- `description: |` YAML block scalar — naive parser collapses to single `|`.
- SKILL.md is frontmatter-only; body lives in `content.md` — body_lines reads as 0.
- Knowledge entry following the `summary / source / confidence` schema — no `tags` or `triggers` by convention.
- Workflow skill with `## Step 1`, `## Step 2` headings — not independent concerns.

### 3. Add exactly one guard

Not five. Not "all the obvious ones at once". One. The guard addresses the top false-positive pattern you actually observed. Update both:

- The **spec file** (`bootstrap/commands/<cmd>.md`) — human-facing reason + flag name if opt-in override is needed.
- The **scan script** — implementation.

Keep them in lockstep so a future reader of either one finds the same story.

### 4. Re-run

Look at the new top 3-5. If still mostly false positives, go back to step 2 with the new top offender. If the remaining candidates look real, proceed to ship.

### 5. Publish spec + calibration together

Bump the command's bootstrap version (semver minor for new feature, patch for tuning). `/hub-commands-publish` bundles the spec change; the scan script is ephemeral Python that future runs regenerate from the updated spec.

Name versions by content, not sequence: `v2.3.0 add archive detection`, `v2.4.1 condense external-imports guard`. Future you will read the tag list.

## Worked example (2026-04-17 session)

`/hub-refactor` archive detection, condition A (perma-stub). Iterations:

| Iter | Result | Root cause | Guard added |
|---|---|---|---|
| 1 | 5 candidates all fully-formed skills | SKILL.md had empty body; real body in `content.md` | Sum both files for `body_lines` |
| 2 | 5 candidates all gstack imports | `0.1.0-draft` version is expected for imports | Skip `source_type: external-git` |
| 3 | 5 candidates with description=`\|` | YAML block-scalar parser collapses | Add `\|` / `>` / chomping parser |
| 4 | 1 candidate (dev-controller-tenant-wrapping-helper) | real metadata-empty skill | ship |

4 iterations, 4 guards, 1 signal. Without this loop the first-pass detector would have proposed archiving 20 healthy entries and the next `/hub-sync` would have re-introduced them.

## Rules

- **One guard per iteration.** Batching hides which guard actually mattered.
- **Update spec and script together.** The spec is what ships; the script is regenerated from it. Drift = future bug.
- **Spec version bump captures calibration.** Re-installing a prior version should reproduce the prior behavior, even if the scan script is regenerated on a newer machine.
- **Favor default-on guards with opt-in override.** `--include-external-imports` beats "remember to exclude". The safe default matches the common case.
- **Resist the perfect heuristic.** A heuristic that over-fires by 10% and ships this week beats a perfect one that never ships. Per-candidate review catches the remainder.
- **Discard low-signal final runs.** If the last run surfaces candidates that would save <15% of anything, publish the scanner with the current guards but don't apply the candidates. The scanner still earns its keep later.

## Related

- See knowledge:pitfall/hub-scan-must-exclude-external-imports — the single highest-value guard across all three hub scanners.
- See knowledge:pitfall/yaml-block-scalar-frontmatter-parsing — the parser bug that calibration iterations always surface.
- See knowledge:pitfall/skill-md-plus-content-md-body-counting — the body-sizing mistake that iterations always surface first.
