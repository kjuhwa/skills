---
version: 0.1.0-draft
name: raw-forecast-signals-need-portfolio-optimization
summary: Raw predicted returns from a forecasting model are not "pure alpha" — they carry market-beta and style-factor exposure; treat them as inputs to a portfolio optimizer, not a strategy.
category: pitfall
tags: [finance, alpha, portfolio-optimization, risk-factors, backtest, production-ml]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/shiyu-coder/Kronos.git
source_ref: master
source_commit: 67b630e67f6a18c9e9be918d9b4337c960db1e9a
source_project: Kronos
source_paths: [README.md, finetune/qlib_test.py]
imported_at: 2026-04-18T00:00:00Z
---

# Raw model signals are not alpha — they need factor neutralization

The Kronos README makes this disclaimer explicit, and it generalizes to every ML-based forecasting project: the numbers coming out of a well-trained forecasting model are **prediction signals**, not a **trading strategy**. In a real quantitative workflow they become inputs to a portfolio-construction step that:

1. **Neutralizes common risk-factor exposures** — market beta, size, value, momentum, industry, country. Without this, a "model that goes long the highest predicted return" is often just a leveraged long-beta position, and its backtest will look great in a bull market and terrible in a drawdown.
2. **Applies turnover, concentration, and position-size constraints** — most signals are noisy at high frequency, and unconstrained rebalancing bleeds alpha into transaction costs.
3. **Models transaction costs and slippage** — Kronos's demo backtest (`finetune/qlib_test.py`) uses conservative defaults (`open_cost=0.001, close_cost=0.0015`) but production backtests need venue-specific microstructure modeling, especially for illiquid names.
4. **Uses multiple signal variants** — Kronos emits `last / mean / max / min` signals per prediction window; combining them (or using them as factors in an MVO) is more robust than picking one.

**Related pitfalls the Kronos demo flags:**
- The top-K-dropout strategy in `qlib_test.py` is a starting point, not a production strategy — no stop-loss, no dynamic sizing, no risk budget.
- A single-model backtest does not estimate market-impact: a strategy that works when backtested on a universe of 300 liquid names may be impossible to execute at scale.
- The provided `QlibDataset` is an example — for non-CN-A-share markets, data loading, corporate-action handling, and calendar logic must be reimplemented.

**Takeaway for ML engineers:** when handing a forecasting model to a quant team, ship the raw prediction tensor with enough metadata (timestamp, symbol, confidence) for them to plug into their optimizer, not a "returns" series. Expect them to regress the signal against factor returns and keep only the residual.
