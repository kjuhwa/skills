---
version: 0.1.0-draft
name: drive-by-refactor-beyond-bug-fix
summary: Asked to fix "empty emails crash the validator", LLMs also tighten email regex, add username length/alnum checks, and add docstrings. That pollutes the diff and can introduce new bugs. Fix only the reported issue.
category: pitfall
tags: [diff-hygiene, surgical-changes, bug-fix-discipline]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/forrestchang/andrej-karpathy-skills.git
source_ref: main
source_commit: c9a44ae835fa2f5765a697216692705761a53f40
source_project: andrej-karpathy-skills
source_path: EXAMPLES.md#surgical-changes-example-1
imported_at: 2026-04-18T08:26:22Z
---

# Pitfall — Drive-by refactor during a bug fix

## Symptom
Prompt: "Fix the bug where empty emails crash the validator."

LLM diff:
- Fixes the empty-email path. ✅
- Tightens email regex to require a `.` after `@`. ⚠ not requested, may reject valid addresses.
- Adds `len(username) < 3` rule. ⚠ new business rule.
- Adds `username.isalnum()` rule. ⚠ new business rule.
- Adds module docstring. ⚠ unrelated.

Each extra change is a potential regression with no tests and no approval.

## Surgical diff
```diff
  def validate_user(user_data):
-     if not user_data.get('email'):
+     email = user_data.get('email', '')
+     if not email or not email.strip():
          raise ValueError("Email required")
```

## Test
Every changed line must trace to the user's bug report. If a reviewer asks "why did this line change?" and the answer is "to improve things," revert it.
