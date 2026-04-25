---
version: 0.1.0-draft
name: nvcc-vs-nvrtc-compilation-tradeoff
summary: NVRTC compiles 10x faster in-process but loses 5-10% perf on some kernels vs NVCC's offline optimization; use NVRTC for iteration (DG_JIT_USE_NVRTC=1), NVCC for production.
category: jit-compilation
tags: [nvcc, nvrtc, jit, cuda-compiler, performance, build-system]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/deepseek-ai/DeepGEMM.git
source_ref: main
source_commit: 7f2a703ed51ac1f7af07f5e1453b2d3267d37d50
source_project: DeepGEMM
source_paths:
  - README.md
  - csrc/jit/compiler.hpp
  - csrc/jit/handle.hpp
imported_at: 2026-04-18T13:12:58Z
---

# NVCC vs NVRTC Compilation Tradeoff

## Summary
Two CUDA compilation paths, both supported by DeepGEMM's JIT layer:

- **NVCC (default):** spawns an external `nvcc` process per kernel. Writes source to temp, reads back CUBIN. Slow (seconds per kernel) but produces the reference-quality binary.
- **NVRTC (`DG_JIT_USE_NVRTC=1`):** in-process compilation via `nvrtcCompileProgram()`. ~10× faster. Supports precompiled headers on CUDA 12.8+.

Same `--ptxas-options=--register-usage-level=10`, same CUTLASS includes, same lazy-loaded CUDA driver calls.

## Why it matters
- NVCC runs post-compilation SASS passes (e.g., FFMA interleaving) that NVRTC skips. On some kernels this costs 5-10%.
- **CUDA 12.9+ narrows the gap** — FFMA interleaving moved into the front-end, so NVRTC gets most of it "for free." DeepGEMM removed the post-compilation optimization flag path entirely once 12.9 landed.
- NVRTC's PCH (Precompiled Headers) in 12.8+ makes incremental iteration much faster — reload time of the DeepGEMM test suite drops dramatically.

## Practical implications
- **Production:** stick with NVCC. The 5-10% matters on hot GEMMs.
- **Rapid iteration / prototyping:** `export DG_JIT_USE_NVRTC=1`. Kernel cache misses become bearable.
- **Cross-version:** if you target a CUDA ≥ 12.9 minimum, NVRTC is probably the better default — the perf gap is basically gone.
- Both paths share the same cache directory and hash keys, so switching between them invalidates cached CUBINs (different tool chain → different hash).
