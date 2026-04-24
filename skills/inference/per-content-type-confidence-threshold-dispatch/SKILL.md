---
name: per-content-type-confidence-threshold-dispatch
description: Apply per-content-type confidence thresholds (read from config) and a 3-mode dispatch (best_guess / medium_confidence / high_confidence) to gate model predictions vs generic fallbacks.
category: inference
version: 1.0.0
version_origin: extracted
confidence: high
tags: [magika, inference]
source_type: extracted-from-git
source_url: https://github.com/google/magika.git
source_ref: main
source_commit: 0a8cb9626bbf76c2194117d9830b23e9052a1548
source_project: magika
imported_at: 2026-04-18T00:00:00Z
---

# Per Content Type Confidence Threshold Dispatch

**Trigger:** An ML classifier produces scores but you need different confidence gates per class (e.g. 0.9 for ambiguous types, 0.5 for unambiguous ones).

## Steps

- Store per-label thresholds in the model config: { label: float } (e.g. {sql: 0.9, markdown: 0.75}).
- After inference, look up threshold for the predicted label and compare score >= threshold.
- If score < threshold, apply overwrite_map to remap to a fallback type (e.g. txt or unknown).
- Implement BEST_GUESS (no threshold), MEDIUM_CONFIDENCE (threshold), HIGH_CONFIDENCE (stricter threshold) as runtime dispatch.
- Default to HIGH_CONFIDENCE — favor precision over recall for security/automation use cases.
- Record the overwrite reason (LowConfidence vs OverwriteMap vs None) in the result for auditability.

## Counter / Caveats

- Thresholds must be hand-tuned per content type from a validation set; no automatic calibration.
- Strict thresholds reduce recall; loose thresholds increase false positives — tradeoff depends on use case.
- Changing thresholds between releases breaks downstream automation; version the config and document changes.
- Content types with few training examples need higher thresholds; popular ones tolerate lower thresholds.

## Source

Extracted from `magika` (https://github.com/google/magika.git @ main).

Files of interest:
- `js/src/prediction-mode.ts:15-19`
- `rust/lib/src/model.rs:29`
- `assets/models/standard_v3_3/config.min.json`
- `python/src/magika/magika.py:57-85`
