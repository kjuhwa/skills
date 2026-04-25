---
version: 0.1.0-draft
name: speculative-decoding-acceptance-length-metric
summary: Acceptance length is the single number you track to know whether speculative decoding is paying off — mean accepted tokens per target verify step, bounded by block_size.
category: observability
tags: [speculative-decoding, metrics, throughput, acceptance]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/z-lab/dflash.git
source_ref: main
source_commit: 1fe684b00efba56490d920d15eeb9ba6e4471751
source_project: dflash
source_path: dflash/benchmark.py
imported_at: 2026-04-18T00:00:00Z
---

# Acceptance length: the headline metric for speculative decoding

## Definition

Per verify step, `acceptance_length = 1 + (number of draft tokens accepted)`. Mean it over all steps of a generation, then over all generations in the benchmark.

```python
accepted = (block_tokens[:, 1:] == posterior[:, :-1]).cumprod(dim=1).sum(dim=1)[0].item()
acceptance_lengths.append(accepted + 1)
```

- Bounded by `[1, block_size]`.
- `1` means every draft token was rejected — target ran a step, accepted only the bonus token, wasted `block_size - 1` positions of compute.
- `block_size` means every draft token matched — best case, fully amortized verify.

## How to read it

| Mean accept len | Interpretation |
|---|---|
| ~1.0 | Draft is uncalibrated or block_size too aggressive; pure overhead. |
| block_size * 0.3–0.6 | Healthy — common on instruction/reasoning data. |
| block_size * 0.7+ | Easy data (formulaic outputs, code boilerplate, long greedy decodes). |
| = block_size | Check your code — you probably wired the draft to echo target. |

## Why a histogram matters

Mean hides bimodal distributions. Two very different runs can both average 4 on `block_size=8`:
- 50% rejected at step 1, 50% accepted all 8 → thrashy.
- Everything accepts around 4 → stable.

The histogram `[count(b) / total for b in range(block_size + 1)]` separates them.

## Relationship to speedup

End-to-end speedup ≈ `mean_accept_len / (1 + verify_overhead/draft_cost)`. If speedup lags acceptance length, your target-verify pass is cache-bound or your draft cost is disproportionately high; profile those before blaming the acceptance rate.

## Pitfalls
- Include only steady-state decode in the mean — the first step (prefill) is not a spec step.
- Temperature > 0 with argmax-based accept test over-rejects compared to rejection-sampling implementations; tune the accept rule before comparing numbers across papers.
- SGLang reports `spec_accept_length` in `meta_info`; vLLM exposes it differently and may not include it in all response shapes.
