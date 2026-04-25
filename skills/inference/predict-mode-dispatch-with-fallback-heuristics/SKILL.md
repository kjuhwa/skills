---
name: predict-mode-dispatch-with-fallback-heuristics
description: Cascade inference through model output → ruled heuristics (UTF-8 validity for tiny files) → generic fallback (txt / unknown), each emitting a distinct overwrite_reason.
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

# Predict Mode Dispatch With Fallback Heuristics

**Trigger:** Robust file-type or content classification that must handle edge cases (empty files, <8-byte files, corrupted files, symlinks).

## Steps

- If size == 0 → return Empty without invoking the model.
- If 0 < size < min_file_size_for_dl → skip model; check UTF-8 validity → Text else Unknown.
- If size >= threshold → extract features (beg/mid/end) and run model.
- Compare model score against per-label threshold; if below, apply overwrite_map to redirect to fallback type.
- Treat symlinks/directories as their own special types without invoking the model.
- Return a structured result {path, status, prediction:{dl, output, score, overwrite_reason}} so callers can audit.

## Counter / Caveats

- min_file_size_for_dl is model-specific; too low = wasted inference, too high = silent miss.
- UTF-8 validity check is naive — Latin-1, UTF-16, etc. look invalid; consider extending if you support non-UTF-8 text.
- Symlink semantics differ on Windows vs *nix; check is_symlink() before reading.
- Score thresholds are per-model-version; bumping the model requires recalibrating thresholds.

## Source

Extracted from `magika` (https://github.com/google/magika.git @ main).

Files of interest:
- `go/magika/scanner.go:59-93`
- `python/src/magika/magika.py:170-210`
- `rust/lib/src/file.rs:1-70`
