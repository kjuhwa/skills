---
name: sample-count-parallel-path-averaging
description: Replicate each input N times inside the batch, run stochastic decoding in parallel, then average the N sampled paths to reduce variance.
category: inference
tags: [monte-carlo, ensemble, sampling, variance-reduction, autoregressive, forecasting]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/shiyu-coder/Kronos.git
source_ref: master
source_commit: 67b630e67f6a18c9e9be918d9b4337c960db1e9a
source_project: Kronos
source_paths: [model/kronos.py]
version: 1.0.0
version_origin: extracted
imported_at: 2026-04-18T00:00:00Z
---

# Replicate-in-batch Monte Carlo averaging for stochastic decoding

## When to use
- You sample from a probabilistic model (temperature > 0, top-p < 1) and want a smoother point estimate than a single draw.
- You have GPU headroom: `batch * sample_count` still fits in memory.
- Latency matters more than full distribution reporting — you just want the expectation.

## Pattern
Expand the time-series batch along a new axis of size `sample_count`, reshape to `(B * sample_count, T, F)`, run the stochastic autoregressive decoder once, then reshape back to `(B, sample_count, T, F)` and take the mean along the sample axis. Because the same input is replicated `sample_count` times but randomness diverges per replica (different multinomial draws), the mean is a Monte-Carlo estimate of `E[y | x]`.

```python
# model/kronos.py auto_regressive_inference
x       = x.unsqueeze(1).repeat(1, sample_count, 1, 1)          # (B, S, T, F)
x       = x.reshape(-1, x.size(2), x.size(3)).to(device)        # (B*S, T, F)
x_stamp = x_stamp.unsqueeze(1).repeat(1, sample_count, 1, 1).reshape(-1, x_stamp.size(1), x_stamp.size(2)).to(device)
y_stamp = y_stamp.unsqueeze(1).repeat(1, sample_count, 1, 1).reshape(-1, y_stamp.size(1), y_stamp.size(2)).to(device)

# ... full AR generation loop over (B*S, ...) ...

z = tokenizer.decode(input_tokens, half=True)                   # (B*S, T, F)
z = z.reshape(-1, sample_count, z.size(1), z.size(2))           # (B, S, T, F)
preds = np.mean(z.cpu().numpy(), axis=1)                        # (B, T, F) — averaged
```

## Why it works / tradeoffs
Replicating along a batch dim exploits GPU parallelism: `sample_count=5` is only ~5x compute but the wall clock grows far less than 5x because attention throughput saturates on small batches first. The mean over independent samples has standard error `sigma / sqrt(S)` so diminishing returns kick in around `S ~ 5–10` for most well-calibrated stochastic decoders. If you instead need quantiles / prediction intervals, keep the `sample_count` axis and report percentiles rather than averaging away. Don't confuse `sample_count` with beam search — beam narrows the distribution, this averages over it.

## References
- `model/kronos.py` in Kronos — `auto_regressive_inference`, the `sample_count` parameter and the `reshape + mean` at the tail
- `KronosPredictor.predict` / `predict_batch` — public surface that exposes `sample_count` to users
