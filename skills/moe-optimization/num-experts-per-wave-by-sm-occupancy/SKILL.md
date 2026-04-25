---
name: num-experts-per-wave-by-sm-occupancy
description: Pick the number of experts processed per persistent-kernel wave so that total blocks (discounted by a 2x imbalance factor) just saturate all SMs, rounded to a divisor of the expert count.
category: moe-optimization
version: 1.0.0
version_origin: extracted
tags: [moe, persistent-kernel, occupancy, sm-utilization, waves, scheduler]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/deepseek-ai/DeepGEMM.git
source_ref: main
source_commit: 7f2a703ed51ac1f7af07f5e1453b2d3267d37d50
source_project: DeepGEMM
source_paths:
  - csrc/jit_kernels/heuristics/mega_moe.hpp
imported_at: 2026-04-18T13:30:00Z
---

# Choose Experts Per Wave By SM Occupancy And Divisibility

## When to use
You're running a fused MoE kernel in persistent-scheduler form: each SM processes a fixed batch of (expert, token) blocks before finishing. You need to decide how many experts to stuff into one wave. Too few → SMs idle at the end. Too many → shared-memory / tmem pressure blocks you from multicasting. And routing is never perfectly balanced, so reserving some slack matters.

## Steps
1. **Cap at the hardware-friendly maximum.** DeepGEMM caps at 32 experts per wave and requires that the number *divides* `num_experts_per_rank`:
   ```cpp
   int max = std::min(32, num_experts_per_rank);
   while (max > 1 and num_experts_per_rank % max != 0) --max;
   ```
   The divisor constraint ensures every wave handles the same count — no tail wave with 2 experts while the rest had 8.
2. **Estimate blocks-per-expert** under the assumption of uniform routing:
   ```cpp
   expected_tokens_per_expert = num_tokens * num_topk / num_experts_per_rank + 1
   num_m_blocks = ceil_div(expected_tokens_per_expert, block_m)
   num_n_blocks = intermediate_hidden / block_n
   num_l1_blocks_per_expert = num_m_blocks * num_n_blocks
   ```
3. **Apply an imbalance factor.** MoE routing never hits the uniform expectation — some experts get 2x the average. DeepGEMM uses `kImbalanceFactor = 2` and solves for experts-per-wave that still keeps SMs busy under that worst-case:
   ```cpp
   num_experts_per_wave = ceil_div(kImbalanceFactor * num_sms, num_l1_blocks_per_expert);
   num_experts_per_wave = min(num_experts_per_wave, max);
   ```
   Intuition: "make sure that even if half the experts send 2x their share, we still have enough blocks to fill all SMs in one wave."
4. **Round up to the nearest divisor of the expert count.** Otherwise the last wave underflows:
   ```cpp
   while (num_experts_per_wave < max and num_experts_per_rank % num_experts_per_wave != 0)
       ++num_experts_per_wave;
   ```
5. **Never go below 1.** Guard with `num_l1_blocks_per_expert > 0 ? ... : 1` since `intermediate_hidden / block_n` can be zero for pathologically small configs.

## Evidence (from DeepGEMM)
- `csrc/jit_kernels/heuristics/mega_moe.hpp:64-93`: `get_num_experts_per_wave_for_mega_moe`, with the explicit comment: "Reduce per-expert block count by this factor since uneven routing leaves some experts with fewer tokens."
- `csrc/jit_kernels/heuristics/mega_moe.hpp:68-74`: the "find the largest divisor of `num_experts_per_rank` that fits in 32" loop.
- `csrc/jit_kernels/heuristics/mega_moe.hpp:82-90`: the imbalance-aware lower bound followed by the round-up-to-divisor step.

## Counter / Caveats
- **`kImbalanceFactor = 2` is a magic number.** It works for DeepSeek's observed routing distribution. If your router is more skewed (top-1 with softmax temperature tricks), bump it to 3 or 4.
- **The 32-cap is hardware-driven** — some SM100 buffer indexing assumes ≤ 32 experts per wave. Lifting it needs kernel changes, not just heuristic changes.
- **Rounding up can produce a value of `max`** even when `max * num_l1_blocks_per_expert >> num_sms`. That over-schedules, which costs shared memory. If you see SMs idling on shared-mem waits, check whether the divisor rounding jumped you past the sweet spot.
