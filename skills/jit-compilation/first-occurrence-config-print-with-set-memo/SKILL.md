---
name: first-occurrence-config-print-with-set-memo
description: Print a JIT-selected config the first time a given shape/desc is encountered, memoizing with `std::unordered_set<std::string>` keyed on the stringified descriptor — so each unique workload prints exactly once.
category: jit-compilation
version: 1.0.0
version_origin: extracted
tags: [diagnostics, logging, jit, memoization, debug]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/deepseek-ai/DeepGEMM.git
source_ref: main
source_commit: 7f2a703ed51ac1f7af07f5e1453b2d3267d37d50
source_project: DeepGEMM
source_paths:
  - csrc/jit_kernels/heuristics/common.hpp
  - csrc/jit_kernels/heuristics/mega_moe.hpp
imported_at: 2026-04-18T13:30:00Z
---

# First-Occurrence Config Print Memoized On Descriptor String

## When to use
Your JIT picks a config (block size, stages, cluster dims) for each unique GEMM/MoE shape. You want debug visibility — "which config got picked for M=128, N=4096, K=7168?" — without flooding the log with the same line 10,000 times per iteration.

The right cadence is "log once per unique input", keyed on the *full* descriptor string (not just M/N/K — that would miss cases where dtype or layout differs).

## Steps
1. **Stringify the descriptor via `operator<<`.** Define `friend std::ostream& operator<<(std::ostream&, const Desc&)` on your `Desc` struct so every field is serialized. This makes the key unique per input combination *and* the log line human-readable.
2. **Inside the config-picking function**, after computing the config:
   ```cpp
   if (get_env<int>("DG_JIT_DEBUG") or get_env<int>("DG_PRINT_CONFIGS")) {
       std::stringstream ss;
       ss << desc;
       const auto key = ss.str();
       static std::unordered_set<std::string> printed;
       if (printed.count(key) == 0) {
           std::cout << desc << ": " << gemm_config << ", " << layout_info << std::endl;
           printed.insert(key);
       }
   }
   ```
3. **`static` scope** means the memo persists across calls but doesn't leak across processes. That's the right semantics for a dev-debug flag.
4. **Gate by env var.** `DG_JIT_DEBUG` (uber) or `DG_PRINT_CONFIGS` (targeted). Zero overhead when off — the string build and set lookup are inside the guard.
5. **Apply the same pattern wherever dispatch happens.** `mega_moe` uses a separate `printed` set with a separate key format (descriptor formatted with `fmt::format`), because the MoE descriptor isn't a struct — it's N separate ints.

## Evidence (from DeepGEMM)
- `csrc/jit_kernels/heuristics/common.hpp:40-50`: the GEMM-side implementation, using `operator<<` of `GemmDesc`.
- `csrc/jit_kernels/heuristics/mega_moe.hpp:198-207`: the MoE-side variant, using `fmt::format` to build the key because the inputs don't form a struct.

## Counter / Caveats
- **Memo grows unbounded.** For long-running inference servers with millions of distinct shapes the set never stops growing. Mitigation: bound the set size (LRU) or gate the print behind a "recent only" policy. In practice, a training run has ~hundreds of distinct shapes, so unbounded is fine.
- **`static unordered_set` is not thread-safe.** If multiple host threads call the dispatch concurrently, you need a mutex or accept rare duplicate prints. DeepGEMM assumes single-threaded dispatch.
- **`stringstream ss; ss << desc` happens on *every* call when debug is enabled**, even on a memoized hit. If the `operator<<` is expensive, hash the key separately.
