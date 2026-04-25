---
name: lookback-only-normalization-no-leakage
description: Compute mean and std only on the lookback window (past), then apply to the full sequence, to avoid leaking future statistics into training or evaluation.
category: preprocessing
tags: [normalization, time-series, data-leakage, train-test-split, forecasting]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/shiyu-coder/Kronos.git
source_ref: master
source_commit: 67b630e67f6a18c9e9be918d9b4337c960db1e9a
source_project: Kronos
source_paths: [finetune/dataset.py, finetune/qlib_test.py, model/kronos.py]
version: 1.0.0
version_origin: extracted
imported_at: 2026-04-18T00:00:00Z
---

# Normalize using past-only statistics to prevent future leakage

## When to use
- You are building a forecasting dataset where each sample has a lookback and a target horizon.
- You want instance-level normalization (each window self-standardized) rather than a global scaler fit on the whole training set.
- You must guarantee that no statistics computed on the target horizon bleed into the input.

## Pattern
For a sliding window of length `lookback + predict`, slice out the first `lookback` rows, compute `mean` and `std` on them, then apply the resulting shift/scale to the entire window (including the prediction target). Clip to a safe range like `[-5, 5]` to tame outliers and stabilize downstream training.

```python
# finetune/dataset.py QlibDataset.__getitem__
past_len = self.config.lookback_window
past_x   = x[:past_len]

x_mean = np.mean(past_x, axis=0)
x_std  = np.std(past_x, axis=0)

x = (x - x_mean) / (x_std + 1e-5)       # applied to full lookback+predict window
x = np.clip(x, -self.config.clip, self.config.clip)
```

At inference time the same rule applies — see `KronosPredictor.predict`:

```python
x_mean, x_std = np.mean(x, axis=0), np.std(x, axis=0)   # x is the lookback only
x = (x - x_mean) / (x_std + 1e-5)
x = np.clip(x, -self.clip, self.clip)
# ... generate predictions ...
preds = preds * (x_std + 1e-5) + x_mean                 # invert using lookback stats
```

## Why it works / tradeoffs
A model that sees future statistics during training silently overfits — its loss curve can look beautiful and its backtest will still blow up, because at deploy time it only has the past. Window-local normalization also handles regime shifts gracefully: each sample is self-calibrating, so you don't need to re-fit a global scaler when you add new tickers or epochs. Tradeoff: the model has to learn scale-invariant patterns, and very short lookbacks produce noisy `std` estimates — the `+ 1e-5` guard matters.

## References
- `finetune/dataset.py` in Kronos — instance-level normalization in `QlibDataset`
- `finetune/qlib_test.py` — same pattern reused for test-set inference
- `model/kronos.py` — `KronosPredictor.predict` applies it at single-series inference
