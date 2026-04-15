---
name: deterministic-coverage-verification
description: Run LLVM-instrumented tests multiple times and verify identical coverage reports — catches compiler/env non-determinism that can mask real bugs.
category: testing
version: 1.0.0
tags: [coverage, llvm, testing, determinism, ci]
source_type: extracted-from-git
source_url: https://github.com/bitcoin/bitcoin
source_ref: refs/remotes/origin/master
source_commit: edcf84c73abcad31346388a4b8712b38742801ce
source_project: bitcoin
version_origin: extracted
confidence: high
---

# Deterministic Coverage Verification

## When to use

Any C/C++ project where test coverage is tracked in CI. Non-deterministic coverage hides flaky tests and reports false gains after unrelated changes.

## Procedure

1. Build the test binary with `-fprofile-instr-generate -fcoverage-mapping` (Clang) — no optimizer surprises in Debug.
2. Run the full suite twice, each time with a distinct `LLVM_PROFILE_FILE=<run>.profraw`.
3. Merge each run: `llvm-profdata merge -sparse <run>.profraw -o <run>.profdata`.
4. Generate a line-level report per run: `llvm-cov export -format=lcov <bin> -instr-profile=<run>.profdata > <run>.lcov`.
5. Diff the two lcov files. Any non-empty diff is a determinism failure — investigate **before** trusting the coverage number.

## Common non-determinism sources

- Thread scheduling in tests that sample `std::chrono` or `std::thread::id`.
- Unseeded RNGs in fixtures.
- Filesystem iteration order (glob results without sort).
- `-ffast-math` / LTO changing branch layout.

## Notes

- Wire this as a nightly CI job, not per-PR — it's a smoke signal, not a gate.
- For fuzz targets, the equivalent gate is "same corpus → same coverage bitmap" (see `fuzz-corpus-seed-management`).

## Evidence

- `contrib/devtools/deterministic-fuzz-coverage/`
- `contrib/devtools/deterministic-unittest-coverage/`
- `contrib/devtools/README.md`
