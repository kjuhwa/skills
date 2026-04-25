---
name: kineto-profiler-bench-with-l2-flush
description: Measure per-kernel GPU time using the torch.profiler kineto trace, flushing L2 between invocations and extracting specific kernel names from the profiling table with unit-aware parsing.
category: testing-gpu
version: 1.0.0
version_origin: extracted
tags: [benchmarking, kineto, torch-profiler, l2-cache, gpu-timing, microbench]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/deepseek-ai/DeepGEMM.git
source_ref: main
source_commit: 7f2a703ed51ac1f7af07f5e1453b2d3267d37d50
source_project: DeepGEMM
source_paths:
  - deep_gemm/testing/bench.py
imported_at: 2026-04-18T13:30:00Z
---

# Kineto Profiler Bench With L2 Cache Flush

## When to use
You're microbenchmarking individual GPU kernels (GEMMs, reductions, TMA copies) and CUDA events alone give you misleading numbers because:
- L2 cache retains the prior iteration's tiles → second call is artificially fast.
- The CPU-side launch overhead bleeds into your timing if you're pacing launches too tightly.
- Multiple kernels per call — you need the time of *one named kernel*, not the total.

Solution: drive `torch.profiler` with a tight schedule, flush L2 with a memset, and parse the profiler table by kernel-name substring.

## Steps
1. **Skip under external profilers.** If `DG_USE_NVIDIA_TOOLS` is set (Nsight Systems / Compute Sanitizer), short-circuit — internal profiling conflicts with those tools. Return dummy `1` (or tuple of 1s).
2. **Flush L2 with an oversized memset** before each invocation:
   ```python
   flush_l2_size = int(8e9 // 4)  # 8 GB of int32
   torch.empty(flush_l2_size, dtype=torch.int, device='cuda').zero_()
   ```
   Oversizing beyond L2 capacity (`~50-100 MB` on modern GPUs) guarantees eviction and gives the GPU a brief idle-equivalent without being fully idle.
3. **Pre-warm the kernel** with a single `fn()` call outside profiling — catches any auto-tuning print/compile-path noise.
4. **Schedule 2 profiler iterations (`range(2)`), each with 1 warmup + 1 active**:
   ```python
   schedule = torch.profiler.schedule(wait=0, warmup=1, active=1, repeat=1)
   ```
   The outer `range(2)` lets the profiler discard the first active window (still warming kernel caches) and only keep the second.
5. **Inside each repeat: run `num_tests` iterations with L2 flush between them.** If you need multi-rank barriers, insert `torch.cuda._sleep(int(2e7))` + `barrier()` before the target `fn()` to eliminate CPU-launch asymmetry.
6. **Parse the profiler table by kernel name substring.** Kineto prints rows like `  my_kernel_name    10ms  5` — split on whitespace, unit-strip `ms|us`, multiply by call count, accumulate:
   ```python
   for name in kernel_names:
       for line in prof_lines:
           if name in line:
               time_str = line.split()[-2]  # e.g. "10.5ms"
               num_str  = line.split()[-1]
               for unit, scale in [('ms', 1e3), ('us', 1e6)]:
                   if unit in time_str:
                       total_time += float(time_str.replace(unit,''))/scale * int(num_str)
                       total_num  += int(num_str)
                       break
   ```
7. **Assert per-name uniqueness** (`sum(name in line for line in lines) <= 1`) unless you intentionally set `with_multiple_kernels=True`. Multiple matches means your name is ambiguous and timings will silently conflate two kernels.
8. **Optionally export the Chrome trace** (`profiler.export_chrome_trace(trace_path)`) so `tracing.ui.perfetto.dev` can visualize the schedule.

## Evidence (from DeepGEMM)
- `deep_gemm/testing/bench.py:79-146`: full `bench_kineto` with the outer `range(2)` pattern, L2 flush, barrier-aware multi-rank path, unit-aware parsing.
- `deep_gemm/testing/bench.py:8-33`: simpler `bench()` without kineto — uses a 256 MB L2 flush and a "big FP32 matmul to absorb CPU launch jitter" trick.
- `deep_gemm/testing/bench.py:87-90`: the `DG_USE_NVIDIA_TOOLS` short-circuit — critical for users who run under external profilers.

## Counter / Caveats
- **L2 flush is per-device.** On multi-GPU benchmarks you must flush each GPU's L2, not just the default device.
- **Parsing the table string is fragile.** PyTorch changes kineto column ordering across versions; `max_name_column_width=100` helps but any format drift breaks the parser. A more robust version uses `profiler.key_averages()` directly rather than parsing `.table()` string output.
- **The 8 GB flush allocates 8 GB of device memory per call** — bench scripts can OOM on small GPUs. Scale down to 2× L2 capacity if you know the GPU.
