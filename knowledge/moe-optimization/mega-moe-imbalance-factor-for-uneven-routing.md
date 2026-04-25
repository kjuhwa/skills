---
version: 0.1.0-draft
name: mega-moe-imbalance-factor-for-uneven-routing
summary: Mega MoE sizes per-expert work assuming a 2x token-imbalance factor. If actual routing skew exceeds that, users must override mk_alignment_for_contiguous_layout.
category: moe-optimization
tags: [moe, load-balancing, kernel-tuning, top-k, distributed-systems]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/deepseek-ai/DeepGEMM.git
source_ref: main
source_commit: 7f2a703ed51ac1f7af07f5e1453b2d3267d37d50
source_project: DeepGEMM
source_paths:
  - csrc/jit_kernels/heuristics/mega_moe.hpp
imported_at: 2026-04-18T13:12:58Z
---

# Mega MoE Imbalance Factor for Uneven Routing

## Summary
Top-k routing in MoE rarely produces perfectly balanced expert loads. Mega MoE's kernel pre-allocates per-expert block counts based on an estimate:

```
expected_tokens_per_expert = (num_tokens × num_topk / num_experts + 1) / kImbalanceFactor
```

with `kImbalanceFactor = 2`. This gives a conservative under-estimate so the total `experts × m_blocks` fits within `num_sms`. The kernel then enumerates `experts_per_wave` against this budget.

## Why it matters
- The factor-of-2 is empirical — works for most production routers but isn't a hard guarantee.
- If your model has a highly skewed router (some experts always winning top-1 by a big margin), the actual tokens-per-top-expert can exceed `2× mean`. The kernel will try to launch more blocks than fit and fail.
- The imbalance also affects MFU estimation — a "100% scheduled" wave may run at 60% efficiency because half the experts get ~0 work.

## Practical implications
- Default works for standard top-k=4 to top-k=8 MoE with reasonably balanced aux-loss. Don't touch it.
- For heavy-skew models or small-batch inference: call `mk_alignment_for_contiguous_layout()` with an explicit larger block count per expert to force the right budget.
- When debugging a Mega MoE launch failure, first check router skew: `tokens per expert histogram` in your training/inference loop. If max/mean > 2, that's your bug.
- Consider adaptive: measure imbalance at runtime and re-dispatch with a larger factor if observed skew > threshold.
