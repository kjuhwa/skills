---
name: synchronized-multi-language-test-data-directory
description: Single tests_data/ tree with one subdir per content type, shared across every language test suite, plus reference outputs and known-failure buckets.
category: testing
version: 1.0.0
version_origin: extracted
confidence: medium
tags: [magika, testing]
source_type: extracted-from-git
source_url: https://github.com/google/magika.git
source_ref: main
source_commit: 0a8cb9626bbf76c2194117d9830b23e9052a1548
source_project: magika
imported_at: 2026-04-18T00:00:00Z
---

# Synchronized Multi Language Test Data Directory

**Trigger:** Multi-language project where every binding must be tested against the same corpus to guarantee parity.

## Steps

- Organize tests_data/basic/<content-type>/ with 1–3 small sample files per type.
- Add tests_data/current_missdetections/ for known-bad cases and tests_data/previous_missdetections/ for regressions.
- Commit reference outputs (predictions + features) under tests_data/reference/ as JSONL.
- In every binding's test suite, iterate over the subdirs and verify detection.
- Set .gitattributes to keep binary samples binary and text samples LF-only — CRLF auto-conversion will corrupt your corpus.
- Periodically audit current_missdetections/ and graduate passing files into basic/.

## Counter / Caveats

- Test files inflate repo size; cap at ~100KB each or use git-lfs.
- Some types need rich examples (PDF/DOCX with text+images+metadata); others need a single byte.
- CRLF/LF line ending drift silently breaks reference comparisons.
- Maintaining the corpus is manual labor; budget time per release to keep it healthy.

## Source

Extracted from `magika` (https://github.com/google/magika.git @ main).

Files of interest:
- `tests_data/basic/ (per-content-type subdirs)`
- `tests_data/features_extraction/`
- `python/tests/`
- `go/cli/cli_test.go`
