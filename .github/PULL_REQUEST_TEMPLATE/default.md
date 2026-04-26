<!--
Default PR template for non-paper, non-technique PRs.
- For paper PRs: use ?template=paper.md
- For technique PRs: use ?template=technique.md
- Otherwise (audits, slash commands, schema amendments, README, infra): use this default

Renamed file: this is the catch-all template for everything that isn't paper or technique authoring.
-->

## Summary

<!-- 2-3 sentences. What changed and why. -->

## Type

Pick one (helps reviewer focus):

- [ ] **Bug fix** — corrects a defect; preserves existing behavior
- [ ] **Audit / lint script** — new or modified `bootstrap/tools/_audit_*.py`
- [ ] **Slash command** — `bootstrap/commands/*.md` edits
- [ ] **Schema amendment** — `docs/rfc/*.md` proposed change
- [ ] **Infrastructure** — installer, hooks, CI, PR templates, repo metadata
- [ ] **Documentation** — README, wiki content, command help
- [ ] **Refactor** — internal change with no external behavior delta
- [ ] **Cleanup** — bulk fixes (e.g., strict-YAML quote-wrap, frontmatter trims)
- [ ] **Other** — specify: ___

## What changed

<!-- File-level breakdown. Be precise. Skip if a single file. -->

- `path/to/file.py` — <!-- one-liner per file -->
- `path/to/other.md` —

## Why

<!--
Justification. Cite the verdict / issue / paper that motivates this change.
Examples:
- "Per #1188 verdict — cost-displacement default-bias should be auto-detected"
- "Closes #1234"
- "Surfaced as TODO in PR #5678 follow-ups"
-->

## Test plan

- [ ] <!-- e.g., audit runs without errors -->
- [ ] <!-- e.g., new command dry-runs correctly -->
- [ ] <!-- e.g., schema audit passes on existing corpus -->

## Audits affected

<!--
Mark which audits this PR could impact and confirm they still pass.
Skip if no audit relevance.
-->

- [ ] `_audit_paper_v03.py`
- [ ] `_audit_paper_imrad.py`
- [ ] `_audit_paper_yaml_strict.py`
- [ ] `_audit_paper_frontmatter_length.py`
- [ ] `_audit_technique_v02.py`
- [ ] `_audit_paper_shape_claim.py` (#1222)
- [ ] `_audit_paper_loops.py`
- [ ] `_audit_paper_falsifiability.py`
- [ ] `_audit_orphan_atoms.py`
- [ ] None applicable

## Cross-references

<!--
- Related PRs: #
- Related issues: #
- Schema docs: docs/rfc/...
-->

## Follow-ups (not blocking)

<!--
Optional: TODOs that surface during this PR but don't block merge.
Filing as issues is recommended (per memory rule).
-->

🤖 Generated with [Claude Code](https://claude.com/claude-code)
