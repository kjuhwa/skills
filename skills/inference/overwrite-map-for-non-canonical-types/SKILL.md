---
name: overwrite-map-for-non-canonical-types
description: Apply a configurable map after inference to redirect non-canonical model labels to canonical user-facing types (e.g. randombytes → unknown), recording the overwrite reason.
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

# Overwrite Map For Non Canonical Types

**Trigger:** Your model was trained on a finer label set than your application wants to expose, and you need a config-driven projection layer.

## Steps

- Define overwrite_map in model config: { non_canonical_label: canonical_label }.
- After inference, look up the predicted label in the map; if present, replace and tag overwrite_reason=OverwriteMap.
- Keep overwrite separate from the threshold-based fallback — they have different reason codes.
- Validate at load time that the map has no cycles and no unknown labels.
- Document each mapping with a one-line rationale (why is this label being overwritten?).
- Surface the original (pre-overwrite) label in the result so callers can audit.

## Counter / Caveats

- Cycles or chains in the map break inference; validate the DAG at load time.
- Conflating LowConfidence and OverwriteMap reasons makes auditing impossible — keep them distinct.
- Changing the map between releases breaks reproducibility; version it and document changes.
- Don't expose the map mutable at runtime unless you also expose a way to audit which version was applied.

## Source

Extracted from `magika` (https://github.com/google/magika.git @ main).

Files of interest:
- `assets/models/standard_v3_3/config.min.json (overwrite_map)`
- `rust/lib/src/model.rs:35-130`
- `js/src/overwrite-reason.ts:15-19`
