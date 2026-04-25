---
version: 0.1.0-draft
name: hermes-testing-wrapper-ci-parity
summary: Why a shell wrapper around pytest prevents 5 concrete sources of local-vs-CI test drift.
category: decision
tags: [testing, pytest, ci, hermetic, parity]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/NousResearch/hermes-agent.git
source_ref: main
source_commit: 73bccc94c7af3a07b4002c2a14a4b54f844bd561
source_project: hermes-agent
imported_at: 2026-04-18T00:00:00Z
---

# Testing Wrapper for CI Parity (`scripts/run_tests.sh`)

## Problem

"Works locally, fails in CI" (and vice versa) had multiple real causes in hermes-agent. Each cause was independently fixable, but combined they produced unpredictable drift. Rather than document all five as etiquette, a wrapper script enforces them.

## The five drifts

| Drift source | Without wrapper | With wrapper |
|---|---|---|
| Provider API keys | Whatever's in your env — tests auto-detect pool | All `*_API_KEY`/`*_TOKEN`/etc. unset |
| HOME / `~/.hermes/` | Your real config+auth.json | Temp dir per test |
| Timezone | Local (PDT, KST, etc.) | UTC |
| Locale | Whatever is set | C.UTF-8 |
| xdist workers | `-n auto` = all cores (20+) | `-n 4` matching CI ubuntu-latest |

## Usage

```bash
scripts/run_tests.sh                                  # full suite, CI-parity
scripts/run_tests.sh tests/gateway/                   # one directory
scripts/run_tests.sh tests/agent/test_foo.py::test_x  # one test
scripts/run_tests.sh -v --tb=long                     # pass-through pytest flags
```

## Why `-n 4` specifically

GHA ubuntu-latest has 4 vCPUs. Running more workers locally surfaces **test-ordering flakes** that CI never sees — the developer fixes the flake, CI is happy, but the fix may have been unnecessary (or hide a real bug). Matching worker count keeps reproduction deterministic.

## Double enforcement

`tests/conftest.py` also enforces points 1-4 as an autouse fixture. The wrapper is belt-and-suspenders:

- Wrapper: catches people who run pytest manually.
- Autouse fixture: catches IDE integrations and direct `python -m pytest` calls.

## When you truly can't use the wrapper

Windows, or an IDE that shells pytest directly. At minimum activate the venv and pass `-n 4`:

```bash
source venv/bin/activate
python -m pytest tests/ -q -n 4
```

Worker count above 4 will surface test-ordering flakes.

## Generalization

For any project where:
- Tests read credentials from env,
- Tests can hit `~/` paths,
- Test order or parallelism matters,
- Timezone/locale affects assertions (datetime format, sorted strings),

a wrapper script is worth the ~30 lines it costs. The alternative is documenting each trap in the contributor guide and discovering a new one every quarter.

## Rules for additions

Any new env var that affects test behavior should be:
1. Added to the wrapper's `unset` list.
2. Added to the autouse fixture's cleanup.
3. Documented in AGENTS.md's testing section.

## Reference

- `scripts/run_tests.sh` — wrapper
- `tests/conftest.py` — `_isolate_hermes_home` autouse fixture
- `AGENTS.md` "Testing" section — rationale in full
