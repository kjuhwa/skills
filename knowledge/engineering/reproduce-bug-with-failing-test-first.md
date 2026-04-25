---
version: 0.1.0-draft
name: reproduce-bug-with-failing-test-first
summary: Before fixing a reported bug, write a test that reproduces it. The test failing proves you understand the bug; the test passing proves the fix works. Especially important for non-deterministic bugs.
category: engineering
tags: [tdd, bug-reproduction, verification, non-determinism]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/forrestchang/andrej-karpathy-skills.git
source_ref: main
source_commit: c9a44ae835fa2f5765a697216692705761a53f40
source_project: andrej-karpathy-skills
source_path: EXAMPLES.md#goal-driven-example-3
imported_at: 2026-04-18T08:26:22Z
---

# Pattern — Reproduce the bug with a failing test first

## When to apply
Any reported bug, especially:
- Non-deterministic behavior (e.g., sort is unstable on duplicate keys).
- Rare edge cases the current suite doesn't cover.
- Anything you'd otherwise "fix" without confirming.

## Procedure
1. **Write a test** that asserts the *correct* behavior.
2. **Run it** — it must fail. If it passes, either the bug isn't what you think, or your assertion is wrong. Investigate.
3. **Implement the fix.**
4. **Re-run** — the test now passes.
5. **Run the full suite** — no regressions.

## Example from source
Sort breaks when two scores tie. The test:
```python
def test_sort_with_duplicate_scores():
    scores = [
        {'name': 'Alice', 'score': 100},
        {'name': 'Bob',   'score': 100},
        {'name': 'Charlie', 'score': 90},
    ]
    result = sort_scores(scores)
    assert result[0]['score'] == 100
    assert result[1]['score'] == 100
    assert result[2]['score'] == 90
```
Run 10 times to confirm non-determinism, then fix with a stable tie-break key: `key=lambda x: (-x['score'], x['name'])`.

## Why it works
A failing test converts "fix the bug" into a verifiable goal, letting the LLM (or human) loop to green without further clarification.
