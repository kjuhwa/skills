# per-content-type-confidence-threshold-dispatch — extended notes

This is an extracted draft from the **magika** project at commit `0a8cb9626b`.
See `SKILL.md` for the procedure. Use the source references below to study the
original implementation before adapting the pattern to a new codebase.

## Source references

- `js/src/prediction-mode.ts:15-19`
- `rust/lib/src/model.rs:29`
- `assets/models/standard_v3_3/config.min.json`
- `python/src/magika/magika.py:57-85`

## When this pattern is a fit

An ML classifier produces scores but you need different confidence gates per class (e.g. 0.9 for ambiguous types, 0.5 for unambiguous ones).

## When to walk away

- Thresholds must be hand-tuned per content type from a validation set; no automatic calibration.
- Strict thresholds reduce recall; loose thresholds increase false positives — tradeoff depends on use case.
- Changing thresholds between releases breaks downstream automation; version the config and document changes.
- Content types with few training examples need higher thresholds; popular ones tolerate lower thresholds.
