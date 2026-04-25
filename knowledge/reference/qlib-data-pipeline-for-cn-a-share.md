---
version: 0.1.0-draft
name: qlib-data-pipeline-for-cn-a-share
summary: Microsoft Qlib provides calendar-aware data loading, feature engineering, TopkDropout strategy, and a backtest executor for CN A-share markets — how Kronos wires it in.
category: reference
tags: [qlib, finance-data, cn-a-share, backtest, csi300, data-pipeline]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/shiyu-coder/Kronos.git
source_ref: master
source_commit: 67b630e67f6a18c9e9be918d9b4337c960db1e9a
source_project: Kronos
source_paths: [finetune/qlib_data_preprocess.py, finetune/qlib_test.py, finetune/config.py]
imported_at: 2026-04-18T00:00:00Z
---

# Qlib data pipeline — how Kronos loads and backtests CN A-share data

[Qlib](https://github.com/microsoft/qlib) is Microsoft Research's open-source AI-for-quant framework. Kronos's `finetune/` pipeline uses Qlib's data loader and backtest engine to demonstrate finetuning on CSI-300 / CSI-800 / CSI-1000 universes. Key integration points:

**Initialization (`qlib.init`).** Pass a `provider_uri` (local path to downloaded Qlib data) and a region flag (`REG_CN`). Kronos defaults to `~/.qlib/qlib_data/cn_data`; the official Qlib README explains how to download and build the parquet tree.

**Calendar-aware loading.** `D.calendar()` returns the full trading-day calendar. Kronos uses `cal.searchsorted(...)` to find the real start and end indices, then extends the range by `lookback_window` and `predict_window` to avoid out-of-range slices on the edges. This is a subtle but important detail — slicing by date alone can silently trim the test set.

```python
# finetune/qlib_data_preprocess.py
cal = D.calendar()
start_index = cal.searchsorted(pd.Timestamp(self.config.dataset_begin_time))
adjusted_start_index = max(start_index - self.config.lookback_window, 0)
real_start_time = cal[adjusted_start_index]
data_df = QlibDataLoader(config=['$open', '$close', '$high', '$low', '$volume', '$vwap']
                        ).load(self.config.instrument, real_start_time, real_end_time)
```

**Feature list.** Qlib exposes base fields with a `$` prefix. Kronos loads OHLC + volume + vwap, then derives `amt = (open+high+low+close)/4 * volume`. Instruments are named by the universe string (`csi300`, `csi800`, etc.), which Qlib resolves to a list of symbols per date.

**Backtest pieces.**
- `TopkDropoutStrategy(topk=N, n_drop=K, hold_thresh=H, signal=series)` — the classic "hold top N, drop bottom K" cross-sectional strategy, driven by a MultiIndex `(instrument, datetime) → score` series.
- `SimulatorExecutor(time_per_step="day", generate_portfolio_metrics=True, delay_execution=True)` — T+1-style execution.
- `exchange_kwargs`: deal price, cost rates, limit thresholds. Kronos defaults: `deal_price="open"`, `open_cost=0.001`, `close_cost=0.0015`, `limit_threshold=0.095` (the CN 9.5% daily price limit rule).
- `risk_analysis(returns_series, freq="day")` prints IR, Sharpe, max drawdown.

**Benchmarks Kronos wires up:**

| Universe | Benchmark code |
|---|---|
| csi300 | SH000300 |
| csi800 | SH000906 |
| csi1000 | SH000852 |

**Practical notes:**
- Installing Qlib: `pip install pyqlib`.
- Daily data is assumed in the demo; minute-level data exists in Qlib but needs `Freq.parse("1min")` and more careful limit/cost modeling.
- Kronos treats `QlibDataset` as a reference implementation — for other markets (US, crypto, HK) use `finetune_csv/` with a plain CSV instead of Qlib.
