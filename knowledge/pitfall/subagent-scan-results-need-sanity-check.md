---
version: 0.1.0-draft
name: subagent-scan-results-need-sanity-check
type: knowledge
category: pitfall
tags: [claude-code, subagent, explore, scan, verification, silent-failure, heuristic]
summary: Explore subagent scans can silently return garbage — duplicated metrics, zero-line false positives, empty arrays — while reporting "success." Always embed a self-verification step in the brief and gate on its output before acting.
source: { kind: session, ref: hub-refactor-scan-retry }
confidence: high
linked_skills: [delegate-bulk-scans-to-explore-subagent]
supersedes: null
extracted_at: 2026-04-18
---

## Fact

When you delegate a bulk file scan to an `Explore` subagent, the result can be wrong in ways that **look normal** at first glance:

1. **Duplicated metric values** — 5 different entries all reporting `body_lines: 894`, or 5 entries all `body_lines: 0`. This means the subagent measured one file five times (glob error) or failed to open the file.
2. **Zero-line false positives** — a skill whose `SKILL.md` is frontmatter-only but whose real body lives in `content.md` gets measured at 0 lines. Misclassified as a "stub."
3. **Empty high-level results** — `merge_candidates: []` for a corpus of 754 entries. Could be correct, but at 0.6 Jaccard threshold some cluster should exist.
4. **Confident but hallucinated paths** — the subagent returns `skills/cli/gstack/subcommand` when the actual structure is different.

The subagent does not flag these. It returns a tidy JSON and the main thread proceeds as if it's ground truth.

## Context / Why

Observed during a `/hub-refactor` run on the skills-hub corpus:

- First scan: all 5 split candidates reported `body_lines: 894` (identical, impossible). All 5 archive candidates reported `body_lines: 0` despite having real content.
- Root cause: subagent only read `SKILL.md`, didn't combine with `content.md`. No warning, no partial-failure signal.

Silent failure is the worst failure mode. If the main thread had applied the archive patches, 5 legitimate skills would have been hidden from `/hub-find`.

## Evidence

Reproduction (from live session):

```json
{
  "archive_candidates": [
    {"selector": "skill:ai/ai-call-with-mock-fallback", "body_lines": 0, "condition": "A"},
    {"selector": "skill:ai/character-sheet-multi-panel-consistency", "body_lines": 0, "condition": "A"},
    {"selector": "skill:ai/claude-cli-from-jvm-via-node-wrapper", "body_lines": 0, "condition": "A"},
    {"selector": "skill:ai/llm-json-extraction", "body_lines": 0, "condition": "A"},
    {"selector": "skill:ai/mcp-runtime-prompt-refresh", "body_lines": 0, "condition": "A"}
  ]
}
```

Every value is 0. In reality these entries have 100-300 line `content.md` files. A second pass with an explicit "sum SKILL.md + content.md" brief produced correct, distinct values (e.g. 1057, 809, 869).

## Applies when

- You invoke `Agent(subagent_type="Explore", ...)` for file/corpus scans.
- Your main-thread flow acts on the subagent's numeric/categorical output.
- The cost of acting on wrong output is higher than re-running the scan.

## Counter / Caveats

**Mitigation — build self-verification into the brief**:

1. Require the subagent to include a `scan_quality: "OK" | "SCAN_INVALID (reason)"` field in its return JSON.
2. Require it to compute and report sanity metrics the main thread can check, e.g.:
   - `distinct_body_line_values`: count of unique body_lines across candidates. Should equal candidate count.
   - `distinct_archive_body_line_values`: same for archive list.
3. Require file-level counting to be explicit, e.g. "For skills, body_lines = wc -l of SKILL.md body + wc -l of content.md body (if exists)."
4. Main thread refuses to proceed if `scan_quality != "OK"` or the distinct counts don't match.

**Don't do**:
- Don't trust terse "success" messages without numeric self-checks.
- Don't let one failed scan discourage delegation — just tighten the brief and retry.
- Don't ask the subagent to "verify its own work semantically" — it'll just agree with itself. Require deterministic counts.

**Meta-lesson**: a subagent is a black box that returns JSON. Treat it like an external API — schema validate, sanity check, fail loud.
