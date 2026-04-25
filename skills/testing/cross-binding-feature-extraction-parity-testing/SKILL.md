---
name: cross-binding-feature-extraction-parity-testing
description: Generate reference feature vectors from one canonical implementation, store as JSONL, and assert byte-for-byte equality from every other binding (Rust↔Python↔JS↔Go).
category: testing
version: 1.0.0
version_origin: extracted
confidence: high
tags: [magika, testing]
source_type: extracted-from-git
source_url: https://github.com/google/magika.git
source_ref: main
source_commit: 0a8cb9626bbf76c2194117d9830b23e9052a1548
source_project: magika
imported_at: 2026-04-18T00:00:00Z
---

# Cross Binding Feature Extraction Parity Testing

**Trigger:** Feature extraction is non-trivial (multi-block sampling, padding, fixed-offset peeks) and MUST be identical across language bindings or the model output drifts.

## Steps

- Pick one binding as canonical (Rust here); add a script that extracts features from every test file and writes JSONL: {path, beg, mid, end, offset_8000, ...}.
- Commit the reference JSONL into tests_data/features_extraction/.
- In every other binding, write a test that loads the reference, re-extracts on the same files, and asserts equality.
- Use tests_data/basic/ (small files spanning 30+ content types) as the input corpus.
- On mismatch, dump a byte-level diff so the diverging binding is obvious.
- Run the parity tests in CI for every binding on every commit.

## Counter / Caveats

- Reference is a frozen ground truth; regenerating requires consensus and a CHANGELOG entry.
- Floating-point precision differences (numpy vs ndarray) can surface as false failures; use approximate equality where appropriate.
- Test data must stay small (<100KB per file) or commit to git-lfs.
- Block ordering is order-sensitive — drift in (beg, mid, end) sequence causes silent test pollution.

## Source

Extracted from `magika` (https://github.com/google/magika.git @ main).

Files of interest:
- `python/tests/test_features_extraction_vs_reference.py`
- `python/scripts/generate_reference.py:1-50`
- `go/magika/features_test.go`
- `tests_data/features_extraction/`
