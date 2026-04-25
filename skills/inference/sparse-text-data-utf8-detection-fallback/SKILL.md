---
name: sparse-text-data-utf8-detection-fallback
description: For files smaller than min_file_size_for_dl (e.g. 8 bytes), bypass the model and classify by UTF-8 validity → text or unknown.
category: inference
version: 1.0.0
version_origin: extracted
confidence: medium
tags: [magika, inference]
source_type: extracted-from-git
source_url: https://github.com/google/magika.git
source_ref: main
source_commit: 0a8cb9626bbf76c2194117d9830b23e9052a1548
source_project: magika
imported_at: 2026-04-18T00:00:00Z
---

# Sparse Text Data Utf8 Detection Fallback

**Trigger:** Tiny files where running the model would be more expensive than meaningful, but you still need a defensible label.

## Steps

- Threshold the file size against min_file_size_for_dl (model-specific, e.g. 8 bytes).
- Read the entire content into memory (it's by definition small).
- Validate with the language stdlib UTF-8 checker (utf8.Valid in Go, str::from_utf8 in Rust, bytes.decode('utf-8') in Python).
- Valid UTF-8 → ContentType::Text (or txt); otherwise ContentType::Unknown.
- Stamp overwrite_reason as 'small_file' (or similar) so callers can audit the fallback.
- Document that this heuristic only catches UTF-8 — not Latin-1, UTF-16, etc.

## Counter / Caveats

- Random binary data is occasionally valid UTF-8 by coincidence; expect a false-positive rate.
- UTF-16 / Latin-1 / Windows-1252 fail UTF-8 validation; users with non-UTF-8 text will see 'unknown'.
- No granular text-type detection (Markdown vs Python vs Shell) — the heuristic is intentionally coarse.
- Tunable threshold should be exposed so callers can change the bypass policy.

## Source

Extracted from `magika` (https://github.com/google/magika.git @ main).

Files of interest:
- `go/magika/scanner.go:68-73`
- `rust/lib/src/file.rs:1-40`
