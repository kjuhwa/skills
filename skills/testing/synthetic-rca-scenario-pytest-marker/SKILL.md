---
name: synthetic-rca-scenario-pytest-marker
description: Use a custom pytest marker (e.g. "synthetic") to gate non-deterministic LLM-based tests away from CI test-cov, while still enabling them via opt-in pytest -m synthetic and Makefile targets.
category: testing
version: 1.0.0
version_origin: extracted
tags: [pytest, markers, llm-testing, ci, non-deterministic]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/Tracer-Cloud/opensre.git
source_ref: main
source_commit: fb5ba0a1b4ef511d16c56a80f1f126b1f581d724
source_project: opensre
source_path: pyproject.toml
imported_at: 2026-04-18T00:00:00Z
---

# Synthetic RCA Scenario Pytest Marker

## When to use
You have two test categories: deterministic unit/integration tests (run on every CI build) and slow non-deterministic LLM-based scenario tests (run nightly or on demand). You want one repo, one pytest invocation, but easy filtering.

## How it works
- Register the marker in `pyproject.toml` so pytest doesn't warn:
  ```toml
  [tool.pytest.ini_options]
  markers = [
    "synthetic: LLM-based synthetic RCA scenario tests (non-deterministic)",
  ]
  ```
- Apply with `@pytest.mark.synthetic` (or `pytestmark = pytest.mark.synthetic` at module level).
- Coverage runs exclude both the marker AND the directory because some collected tests don't have the mark explicitly set:
  ```makefile
  test-cov:
      pytest -n auto -v --cov=app --cov-report=term-missing \
        --ignore=tests/synthetic -m "not synthetic"

  test-synthetic:
      pytest -m synthetic -v tests/synthetic/
  ```

## Example
```python
import pytest

@pytest.mark.synthetic
def test_root_cause_for_oom_alert(rca_runner, oom_fixture):
    result = rca_runner.invoke(oom_fixture)
    # Soft assertion — non-deterministic
    assert "memory" in result.root_cause.lower() or "oom" in result.root_cause.lower()
```

## Gotchas
- The `--ignore=tests/synthetic` plus `-m "not synthetic"` belt-and-suspenders approach catches synthetic tests that someone forgot to mark.
- Use `pytest-xdist` (`-n auto`) for the deterministic suite; synthetic tests with real LLM calls usually need to run sequentially to respect rate limits.
- Document the marker in the same `markers` list so `pytest --markers` is self-documenting for new contributors.
- Pair with a `tests/synthetic/run_suite.py` script with a `--scenario` flag so users can target a single scenario for debugging.
