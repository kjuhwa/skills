# cross-binding-feature-extraction-parity-testing — extended notes

This is an extracted draft from the **magika** project at commit `0a8cb9626b`.
See `SKILL.md` for the procedure. Use the source references below to study the
original implementation before adapting the pattern to a new codebase.

## Source references

- `python/tests/test_features_extraction_vs_reference.py`
- `python/scripts/generate_reference.py:1-50`
- `go/magika/features_test.go`
- `tests_data/features_extraction/`

## When this pattern is a fit

Feature extraction is non-trivial (multi-block sampling, padding, fixed-offset peeks) and MUST be identical across language bindings or the model output drifts.

## When to walk away

- Reference is a frozen ground truth; regenerating requires consensus and a CHANGELOG entry.
- Floating-point precision differences (numpy vs ndarray) can surface as false failures; use approximate equality where appropriate.
- Test data must stay small (<100KB per file) or commit to git-lfs.
- Block ordering is order-sensitive — drift in (beg, mid, end) sequence causes silent test pollution.
