---
name: batch-predict-per-series-normalize-denormalize
description: Stack per-series inputs into a GPU batch with per-series mean/std, predict in parallel, then denormalize back to each series' original scale.
category: inference
tags: [batch-inference, normalization, gpu, parallel-prediction, multivariate-time-series]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/shiyu-coder/Kronos.git
source_ref: master
source_commit: 67b630e67f6a18c9e9be918d9b4337c960db1e9a
source_project: Kronos
source_paths: [model/kronos.py, examples/prediction_batch_example.py]
version: 1.0.0
version_origin: extracted
imported_at: 2026-04-18T00:00:00Z
---

# Batch-predict N series in parallel while preserving per-series scale

## When to use
- You have many independent time series (multiple tickers, sensors, houses) and want to fan them into one GPU forward pass.
- Each series has a different scale, so a global normalization would squash the weaker ones.
- All series share the same lookback length and prediction horizon (a precondition for stacking).

## Pattern
Validate that every series has the same `seq_len` and `pred_len`. For each series, compute its own `mean`/`std` from its lookback, normalize, clip to `[-clip, clip]`, stash mean/std. Stack all normalized arrays into a `(B, seq_len, feat)` batch and run one forward. Afterwards, map each row back with its own mean/std before returning per-series DataFrames.

```python
# model/kronos.py predict_batch (abridged)
for i, df in enumerate(df_list):
    ...
    x       = df[feature_cols].values.astype(np.float32)
    x_mean  = np.mean(x, axis=0)
    x_std   = np.std(x, axis=0)
    x_norm  = np.clip((x - x_mean) / (x_std + 1e-5), -clip, clip)
    x_list.append(x_norm); means.append(x_mean); stds.append(x_std)

# enforce uniform shapes so stacking is legal
if len(set(seq_lens)) != 1: raise ValueError(...)
if len(set(y_lens))   != 1: raise ValueError(...)

x_batch = np.stack(x_list, axis=0).astype(np.float32)   # (B, seq_len, feat)
preds   = self.generate(x_batch, x_stamp_batch, y_stamp_batch, pred_len, ...)

# per-series denormalize on the way out
pred_dfs = []
for i in range(num_series):
    preds_i = preds[i] * (stds[i] + 1e-5) + means[i]
    pred_dfs.append(pd.DataFrame(preds_i, columns=feature_cols, index=y_timestamp_list[i]))
```

## Why it works / tradeoffs
One forward pass over a `(B, T, F)` tensor amortizes kernel launches and attention overhead across all series — typically 5-10x faster than a Python loop. Per-series normalization preserves the model's assumption that inputs are roughly unit-variance, which matters when the pretrained model was trained this way. The constraint that all series share the same lookback/pred_len is the price for a single stacked tensor; if horizons differ, bucket by horizon and call this function once per bucket.

## References
- `model/kronos.py` in Kronos — `KronosPredictor.predict_batch`
- `examples/prediction_batch_example.py` — minimal usage with 5 series
