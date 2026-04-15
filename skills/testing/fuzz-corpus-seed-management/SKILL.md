---
name: fuzz-corpus-seed-management
description: Structured libFuzzer workflow — seed corpora in a separate asset repo, determinism verification, and reproducible crash workflows.
category: testing
version: 1.0.0
tags: [fuzzing, libfuzzer, llvm, testing, corpus]
source_type: extracted-from-git
source_url: https://github.com/bitcoin/bitcoin
source_ref: refs/remotes/origin/master
source_commit: edcf84c73abcad31346388a4b8712b38742801ce
source_project: bitcoin
version_origin: extracted
confidence: high
---

# libFuzzer Corpus Seeding and Determinism

## When to use

Any C/C++ project using libFuzzer that wants (a) per-target corpus reuse across machines, (b) reproducible crash triage, (c) a way to catch non-determinism in coverage itself.

## Procedure

1. Keep fuzz **corpora in a separate repo** (e.g. `<project>-qa-assets`), organized by target: `fuzz_corpora/<target_name>/`. Pin a commit in CI. Keeps the main repo small and corpora diffable.
2. Build with `-DBUILD_FOR_FUZZING=ON` plus `-fsanitize=address,undefined,fuzzer-no-link` and the per-target `-fsanitize=fuzzer` only on the target binary.
3. Run: `FUZZ=<target> build/bin/fuzz <path-to-corpus>/<target>` — libFuzzer prints `NEW` for any input that extends coverage.
4. New inputs promote to the asset repo via PR — never auto-commit from a CI runner.
5. Reproduce a crash with `build/bin/fuzz <corpus_dir>/<crash_hash>`; file in the asset repo if it reproduces on main.
6. Periodically run a determinism check: rebuild with `-fprofile-instr-generate -fcoverage-mapping`, run the same corpus twice, merge with `llvm-profdata`, diff with `llvm-cov`. Any delta means non-determinism in the target, not the harness.

## Notes

- Keep each target's corpus under a few MB so CI fetch stays fast; prune with libFuzzer's `-merge=1`.
- One harness per input shape, not per feature — reuse drives coverage.

## Evidence

- `doc/fuzzing.md`
- `contrib/devtools/deterministic-fuzz-coverage/`
- `contrib/devtools/README.md`
