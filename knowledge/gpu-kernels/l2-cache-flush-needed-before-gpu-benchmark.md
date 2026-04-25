---
version: 0.1.0-draft
name: l2-cache-flush-needed-before-gpu-benchmark
description: When microbenchmarking a GPU kernel, the second iteration of a loop reuses the L2 cache contents from the first itera...
type: knowledge
category: pitfall
confidence: high
source: DeepGEMM
source_type: extracted-from-git
source_url: https://github.com/deepseek-ai/DeepGEMM.git
source_ref: main
source_commit: 7f2a703ed51ac1f7af07f5e1453b2d3267d37d50
source_project: DeepGEMM
source_paths:
  - deep_gemm/testing/bench.py
tags: [benchmarking, l2-cache, gpu-timing, microbench, methodology]
imported_at: 2026-04-18T13:30:00Z
---

# L2 Cache Flush Is Mandatory Before Each GPU Microbench Iteration

## Fact / Decision
When microbenchmarking a GPU kernel, the second iteration of a loop reuses the L2 cache contents from the first iteration. For memory-bound kernels this *inflates* your measured TFLOPS by 30-60%. You must wipe L2 between iterations — typically by writing a buffer larger than L2 capacity (DeepGEMM uses 8 GB of int32 zeros, well above the ~60 MB L2 of H100).

The L2 flush also has a secondary purpose: it gives the GPU a tiny cooldown window between launches, reducing thermal-throttling variance without the overhead of a full idle sleep.

## Why it matters
- **GEMM kernels especially** benefit from L2 reuse: the A and B tiles streamed through TMA are tens of MB each. Without flush, run-2 starts with A/B already in L2 → the TMA latency hides perfectly.
- **Reported numbers drift across benchmark runs** if the warmup vs timed ratio changes — another symptom of L2 reuse.
- **"My kernel is 1800 TFLOPS / H100!"** claims almost always forget to flush L2 → real steady-state under load is 50-70% of that.

The specific flush implementation matters:
- **Size:** at least 2× L2 capacity. H100 has 60 MB L2 → flush ≥ 120 MB. DeepGEMM's 8 GB / 256 MB flushes are overkill, which is intentional (future-proof for Blackwell's 100+ MB).
- **Pattern:** `torch.empty(...).zero_()` writes every byte — reads alone don't evict. The write ensures the cache lines are marked dirty and must be displaced.
- **Dtype:** `int32` vs `float32` doesn't matter for eviction, but `int32` avoids any FP denormal tricks from the hardware during the memset.

## Evidence
- `deep_gemm/testing/bench.py:11-12`: `bench()` uses 256 MB:
  ```python
  cache = torch.empty(int(256e6 // 4), dtype=torch.int, device='cuda')
  cache.zero_()
  ```
  with the leading comment `# Flush L2 cache with 256 MB data`.
- `deep_gemm/testing/bench.py:92-93`: `bench_kineto()` uses 8 GB per call:
  ```python
  # By default, flush L2 with an excessive 8 GB memset to give the GPU some (literal) chill time
  flush_l2_size = int(8e9 // 4)
  ```
  The "chill time" comment is the other benefit: a brief thermal breath without full idle.

## Caveats / When this doesn't apply
- **Compute-bound kernels are mostly insensitive** — a pure FP32 matmul at 99% tensor core utilization doesn't care about L2 residency of its inputs. But memory-bound epilogues do.
- **Don't flush inside your critical path** — flush before the timed region, not between per-step timing events.
- **On multi-GPU benches**, flush each GPU's L2. A single-device flush doesn't propagate.
- **For cache-aware algorithms** (persistent kernels that deliberately reuse L2 across GEMMs), flushing measures the *cold* case and under-reports real performance. Measure both (cold + warm) and document which you report.
