---
name: calendar-time-feature-encoding
description: Decompose a timestamp into minute, hour, weekday, day, month integer columns and feed each through a small embedding that is summed into the model input.
category: preprocessing
tags: [time-features, temporal-embedding, calendar, transformer, time-series]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/shiyu-coder/Kronos.git
source_ref: master
source_commit: 67b630e67f6a18c9e9be918d9b4337c960db1e9a
source_project: Kronos
source_paths: [model/kronos.py, model/module.py, finetune/dataset.py]
version: 1.0.0
version_origin: extracted
imported_at: 2026-04-18T00:00:00Z
---

# Decompose timestamps into calendar fields with per-field learned (or fixed) embeddings

## When to use
- You model time series where "Monday morning" and "Friday afternoon" behave very differently (markets, energy, traffic, retail).
- You want temporal context to inject seasonality without feeding a raw unix timestamp that the model has to re-learn to parse.
- You need one embedding module that works for both learned (trainable) and sinusoidal (fixed) modes.

## Pattern
At data-prep time, expand `timestamp` into 5 integer columns: `minute (0–59), hour (0–23), weekday (0–6), day (1–31), month (1–12)`. Feed each integer into its own `nn.Embedding` of the right vocab, and sum the results into the token embedding. Offer a `learn_te` switch that swaps `nn.Embedding` for a fixed sinusoidal table when you want positional-encoding-style behavior that is free of training.

```python
# model/kronos.py (data side)
def calc_time_stamps(x_timestamp):
    time_df             = pd.DataFrame()
    time_df['minute']   = x_timestamp.dt.minute
    time_df['hour']     = x_timestamp.dt.hour
    time_df['weekday']  = x_timestamp.dt.weekday
    time_df['day']      = x_timestamp.dt.day
    time_df['month']    = x_timestamp.dt.month
    return time_df
```

```python
# model/module.py (model side)
class TemporalEmbedding(nn.Module):
    def __init__(self, d_model, learn_pe):
        super().__init__()
        Embed = FixedEmbedding if not learn_pe else nn.Embedding
        self.minute_embed  = Embed(60, d_model)
        self.hour_embed    = Embed(24, d_model)
        self.weekday_embed = Embed(7,  d_model)
        self.day_embed     = Embed(32, d_model)   # 1..31 plus pad
        self.month_embed   = Embed(13, d_model)   # 1..12 plus pad

    def forward(self, x):       # x: (B, T, 5) int
        x = x.long()
        return (self.minute_embed(x[:, :, 0])
              + self.hour_embed(x[:, :, 1])
              + self.weekday_embed(x[:, :, 2])
              + self.day_embed(x[:, :, 3])
              + self.month_embed(x[:, :, 4]))
```

## Why it works / tradeoffs
Integer-bucketed calendar features are cheap to compute and compatible with any tokenizer downstream. Separate embeddings per field let the model learn `Sunday` and `December` independently instead of entangling them in one sinusoid. The sum aggregation keeps the residual stream dimension constant. Tradeoff: does not capture absolute position (year, epoch) — if trend matters, add a scaled scalar time feature or a year embedding. For sub-minute data add a `second` field; for daily data drop `minute`/`hour`. The `FixedEmbedding` (sinusoidal) fallback is useful when you want the field to act as a positional encoding that generalizes to unseen values.

## References
- `model/kronos.py` in Kronos — `calc_time_stamps` extracts the 5 calendar fields
- `model/module.py` — `TemporalEmbedding`, `FixedEmbedding`
- `finetune/dataset.py` — how the fields are cached on the DataFrame before training
