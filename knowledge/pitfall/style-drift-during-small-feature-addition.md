---
version: 0.1.0-draft
name: style-drift-during-small-feature-addition
summary: Adding logging to a function shouldn't flip single quotes to double, add type hints, rewrite docstrings, or reorganize blocks. Match the existing style, even if you'd do it differently.
category: pitfall
tags: [style-consistency, diff-hygiene, surgical-changes]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/forrestchang/andrej-karpathy-skills.git
source_ref: main
source_commit: c9a44ae835fa2f5765a697216692705761a53f40
source_project: andrej-karpathy-skills
source_path: EXAMPLES.md#surgical-changes-example-2
imported_at: 2026-04-18T08:26:22Z
---

# Pitfall — Style drift on a small edit

## Symptom
Prompt: "Add logging to the upload function."

LLM diff:
- Adds logging calls. ✅
- Converts `'single'` quotes to `"double"`. ❌ existing file uses singles.
- Adds `file_path: str, destination: str -> bool` type hints. ❌ existing code has none.
- Adds docstring. ❌ not requested.
- Reformats whitespace and refactors `success = response.status_code == 200`. ❌ unrelated.

Every unrelated change is churn that hides the real edit in review.

## Surgical diff
Add the `logger = logging.getLogger(__name__)` import and the `logger.info / logger.error / logger.exception` calls. Leave quotes, signatures, docstrings, and block structure **exactly as they were**.

## Rule
Match existing style, even if the existing style is worse than what you'd write from scratch. Style upgrades are their own PR with their own review.
