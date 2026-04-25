---
version: 0.1.0-draft
name: nvcc-12-9-auto-ffma-interleaving
description: Earlier DeepGEMM versions shipped a SASS-level post-optimizer that interleaved `FFMA` instructions in the compiled cu...
type: knowledge
category: decision
confidence: high
source: DeepGEMM
source_type: extracted-from-git
source_url: https://github.com/deepseek-ai/DeepGEMM.git
source_ref: main
source_commit: 7f2a703ed51ac1f7af07f5e1453b2d3267d37d50
source_project: DeepGEMM
source_paths:
  - README.md
  - csrc/jit/compiler.hpp
tags: [nvcc, ffma, post-optimization, compiler-version, sass]
imported_at: 2026-04-18T13:30:00Z
---

# NVCC 12.9 Auto-Interleaves FFMA Instructions (Obsoleting Post-Optimization)

## Fact / Decision
Earlier DeepGEMM versions shipped a SASS-level post-optimizer that interleaved `FFMA` instructions in the compiled cubin to hide pipeline latency. Starting with NVCC 12.9, the compiler does this automatically. DeepGEMM has *removed* its post-optimizer and recommends NVCC 12.9+ as the best path for SM90 performance.

## Why it matters
- **If you're on NVCC ≤ 12.8, you're leaving a measurable amount of performance on the table** on SM90 GEMMs — roughly 5-10% on compute-bound shapes where FFMA throughput matters.
- **DIY SASS post-optimizers are high-maintenance.** They break on each CUDA version because SASS encoding changes. Handing the optimization to NVCC is a clean exit.
- **The README's guidance is prescriptive:** CUDA 12.3+ works, but "we highly recommend 12.9 or higher for the best performance." For SM100 it's *required* (12.9 added `sm_100f` family suffix too).

The 12.9 compiler also adds:
- Auto arch-family suffix (`sm_100f`) for forward-compat with future compute caps.
- Better handling of CUTLASS 4.x templates.
- Relaxed `--expt-extended-lambda` constexpr requirements.

## Evidence
- `README.md:16-22`: the release note:
  > 2025.07.20: ... NVRTC and post-compilation SASS optimization are all disabled. ... As NVCC 12.9 will automatically do the FFMA interleaving, all post optimizations will be no longer supported.
- `README.md:33-34`: requirements state CUDA 12.3 minimum, with 12.9+ recommended for performance.
- `csrc/jit/compiler.hpp:185-190`: the NVCC version check warns on < 12.9:
  ```cpp
  if (major == 12 and minor < 9)
      printf("Warning: please use at least NVCC 12.9 for the best DeepGEMM performance\n");
  ```
- `csrc/jit/compiler.hpp:203-205`: arch-family suffix is only enabled for NVCC > 12 or ≥ 12.9:
  ```cpp
  const auto arch = device_runtime->get_arch(false, nvcc_major > 12 or nvcc_minor >= 9);
  ```

## Caveats / When this doesn't apply
- **Auto-interleaving is heuristic.** For extremely hand-tuned kernels you might still beat NVCC manually — but the gap shrank from ~10% to < 1%, and maintaining hand-tuned SASS is a full-time job.
- **Non-FFMA instructions (FP64, integer) are not reordered** by this pass. If your kernel is bottlenecked on integer ALU, version doesn't help.
- **NVRTC doesn't get the same treatment on older CUDA** — NVRTC's instruction selector is slightly different. The DeepGEMM README warns that NVRTC "may have performance loss with some cases."
- **Downstream tools like Nsight Compute read the cubin** — if you had a post-optimizer dumping hand-rewritten cubin, profiler views change after removing it. Expect different hotspot lines.
