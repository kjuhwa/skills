---
name: speculative-decoding-acceptance-histogram
description: Summarize speculative decoding runs with baseline vs spec throughput, speedup ratio, mean acceptance length, and a per-bucket acceptance-length histogram.
category: observability
version: 1.0.0
version_origin: extracted
tags: [speculative-decoding, benchmark, metrics, throughput, histogram]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/z-lab/dflash.git
source_ref: main
source_commit: 1fe684b00efba56490d920d15eeb9ba6e4471751
source_project: dflash
source_path: dflash/benchmark.py
imported_at: 2026-04-18T00:00:00Z
---

# Speculative Decoding Acceptance Histogram

## When to use
- You measured both baseline (block_size=1) and speculative (block_size=k) throughput on the same prompts.
- You want a single print block that tells you *why* the speedup is what it is — mean acceptance length plus per-bucket distribution over `0..block_size`.

## Pattern

```python
def _make_decode_metrics(num_output_tokens, generation_tps, acceptance_lengths):
    return SimpleNamespace(
        num_output_tokens=num_output_tokens,
        time_per_output_token=(1.0 / generation_tps) if generation_tps > 0 else float("inf"),
        acceptance_lengths=acceptance_lengths,
    )


def _print_decode_summary(responses, block_size):
    baseline_tpot = np.mean([r[1].time_per_output_token for r in responses])
    dflash_tpot   = np.mean([r[block_size].time_per_output_token for r in responses])
    print(f"Baseline throughput: {1 / baseline_tpot:.2f} tok/s")
    print(f"DFlash throughput:  {1 / dflash_tpot:.2f} tok/s")
    print(f"Decoding speedup:   {baseline_tpot / dflash_tpot:.2f}")

    mean_accept = np.mean([np.mean(r[block_size].acceptance_lengths) for r in responses])
    print(f"Average Acceptance length: {mean_accept:.2f}")

    accs = list(chain.from_iterable(r[block_size].acceptance_lengths for r in responses))
    hist = [accs.count(b) / len(accs) for b in range(block_size + 1)]
    print(f"Acceptance length histogram: {[f'{x * 100:.1f}%' for x in hist]}")
```

## What to read into the output
- **Speedup** much smaller than `block_size`: draft is poorly calibrated; high reject rate or verify overhead dominates.
- **Histogram spike at 1**: draft is essentially being rejected every step — the draft model does not match the target's distribution.
- **Histogram spike at `block_size`**: dataset is "easy" (low-entropy continuations); you might push `block_size` higher for more speedup.
- **Wide spread**: normal; mean acceptance length is the right summary stat.

## Gotchas
- `time_per_output_token = 1 / tps` assumes `num_output_tokens` matched between baseline and spec; if they diverge (different stop-token logic), compare wall-time per completion instead.
- `responses` is indexed by the block_size the run used — here the code keys `r[1]` for baseline and `r[block_size]` for spec, not by name. Preserve that convention or refactor both ends.
- `np.mean` over a Python list of lists degrades silently for empty responses — guard `if responses:` at entry.
