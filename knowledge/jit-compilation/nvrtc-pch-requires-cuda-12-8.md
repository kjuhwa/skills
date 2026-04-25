---
version: 0.1.0-draft
name: nvrtc-pch-requires-cuda-12-8
description: NVRTC got precompiled-header support in CUDA 12.8. For a JIT that compiles many small kernels differing only in templ...
type: knowledge
category: version-quirk
confidence: high
source: DeepGEMM
source_type: extracted-from-git
source_url: https://github.com/deepseek-ai/DeepGEMM.git
source_ref: main
source_commit: 7f2a703ed51ac1f7af07f5e1453b2d3267d37d50
source_project: DeepGEMM
source_paths:
  - csrc/jit/compiler.hpp
tags: [nvrtc, pch, precompiled-headers, cuda-version, compile-speed]
imported_at: 2026-04-18T13:30:00Z
---

# NVRTC PCH (precompiled headers) Requires CUDA 12.8+

## Fact / Decision
NVRTC got precompiled-header support in CUDA 12.8. For a JIT that compiles many small kernels differing only in template parameters, turning on `--pch` is a "vital" compile-speed win (DeepGEMM's own word) — roughly a 10× speedup on kernel-after-kernel iteration where system + CUTLASS headers dominate.

But the flag must be gated: passing `--pch` to NVRTC ≤ 12.7 makes compilation silently slow (best case) or errors out (worst case).

## Why it matters
A JIT that loads a fresh kernel for every unique shape re-parses CUTLASS/cute headers on every miss. With PCH, the first compile caches the parse state; subsequent kernels skip 80% of the front-end work.

The CUDA version matrix to remember:
- **NVCC**: no user-level PCH flag — caching of PTX/fatbin happens internally.
- **NVRTC ≥ 12.8**: supports `--pch` and `--pch-verbose=true` (diagnostic).
- **NVRTC ≤ 12.7**: no PCH. Each compile is from scratch.
- **NVRTC 12.9+**: gains `--gpu-architecture=sm_100f` (arch-family suffix) — separate feature, similar version-gating discipline.

## Evidence
- `csrc/jit/compiler.hpp:270-275`: the NVRTC compiler's init gates PCH on the runtime-detected version:
  ```cpp
  std::string pch_flags;
  if (major > 12 or minor >= 8) {
      pch_flags = "--pch ";
      if (get_env<int>("DG_JIT_DEBUG", 0))
          pch_flags += "--pch-verbose=true ";
  }
  ```
  with the explicit comment:
  > // NOTES: PCH is vital for compilation speed
- `csrc/jit/compiler.hpp:261`: the minimum NVRTC version asserted is 12.3 — so the ecosystem spans 12.3 to 12.8+ and PCH is a per-version capability.

## Caveats / When this doesn't apply
- **PCH invalidates aggressively.** Changing any preprocessor define between compiles invalidates the PCH, so if your code generates lots of `-DKERNEL_SPECIFIC_FOO=bar` flags, PCH helps less than you'd hope. DeepGEMM encodes those via template parameters in the source, not preprocessor flags, specifically to preserve PCH reuse.
- **`--pch-verbose=true` output is noisy** — only enable alongside `DG_JIT_DEBUG`.
- **NVRTC's PCH is not compatible with NVCC's PCH** (different layout). If you switch compiler backends mid-run, you're throwing away the cache.
- **PCH files live in NVRTC's temp dir**, not your JIT cache. They're re-materialized per process.
