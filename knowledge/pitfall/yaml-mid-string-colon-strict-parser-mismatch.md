---
version: 0.1.0-draft
name: yaml-mid-string-colon-strict-parser-mismatch
description: PyYAML accepts mid-string colon-space in unquoted scalars but Ruby Psych and GitHub renderer reject as malformed mapping
category: pitfall
source:
  kind: corpus
  ref: skills-hub@1152
confidence: high
linked_skills: []
tags: [yaml, parser-strictness, frontmatter, github-render, pyyaml, psych]
---

**Fact:** YAML parsers disagree on mid-string `: ` (colon followed by space) inside unquoted plain scalars. PyYAML's `safe_load` accepts the entire line as a single string. Ruby Psych (GitHub's web YAML renderer, Jekyll, many CI lints) rejects it as `mapping values are not allowed in this context`, errorring at the column where the second colon appears.

**Why:** YAML spec leaves plain-scalar termination ambiguous in edge cases. PyYAML extends the scalar greedily — once it has started a string value, it keeps consuming until end-of-line. Psych follows a stricter interpretation that treats `: <alpha>` mid-line as a potential nested mapping start, which then fails the indentation check because the apparent sub-key has the wrong indent. Same input file, two different parse trees, one error.

**How to apply:**
- Replace mid-string `: ` with `—` (em-dash), `;`, or `,` in unquoted scalars. The fix is purely punctuational — no semantic content changes.
- Wrap the entire value in quotes (`"value: with colon"`) — quoted scalars terminate at the closing quote regardless of inner content.
- Use block scalars (`|` or `>`) for multi-line values that might contain colons. Block scalars terminate at de-indented lines, not at colons.
- Don't rely on local PyYAML acceptance — even if your local lint passes, GitHub Preview tab and any Psych-based consumer may reject the same file.
- Lint with multiple parsers (or a regex scan) if your YAML targets multiple consumers (web display, server config, CI). PyYAML alone is not sufficient coverage.

**Evidence:**
- skills-hub PR #1151 merged with `summary: ... Tradeoff: correctness vs throughput.` in a paper frontmatter — passed local PyYAML audits, GitHub Preview tab errored "mapping values are not allowed in this context at line 43 column 173" immediately on merge.
- PR #1152 fixed with em-dash replacement (1-line diff): `Tradeoff: correctness vs throughput` → `— correctness granularity vs throughput`. No semantic loss.
- PR #1153 added `_audit_paper_yaml_strict.py` — pure-regex scan that catches the pattern regardless of consumer parser. PyYAML-based audits cannot catch it because they accept the input.
- Second offender found by the new audit on first run: `paper/db/migration-checkpoint-overhead` line 11 had `Recommended granularity: per-batch, not per-row.` — same pattern, latent. Fixed in PR #1154.
- Final state: `_audit_paper_yaml_strict.py` reports 100% compliance (39/39 files) across paper + technique frontmatters.

**Why this matters for AI agents:** AI-authored YAML frontmatter routinely uses prose patterns like "Tradeoff: X vs Y" or "Recommended approach: Z" because they read naturally. PyYAML's lenient acceptance reinforces the pattern by passing every local test. The mismatch only surfaces at consumer time (GitHub render, Jekyll build, CI lint). The audit-fleet pattern of "use a different parser than the one your authors run locally" applies anywhere multiple parsers consume the same file.
