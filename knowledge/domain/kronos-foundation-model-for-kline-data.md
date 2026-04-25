---
version: 0.1.0-draft
name: kronos-foundation-model-for-kline-data
summary: Kronos is an open-source decoder-only foundation model trained on OHLCV candlesticks from 45+ global exchanges for financial time-series forecasting.
category: domain
tags: [kronos, foundation-model, finance, ohlcv, kline, time-series, aaai-2026]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/shiyu-coder/Kronos.git
source_ref: master
source_commit: 67b630e67f6a18c9e9be918d9b4337c960db1e9a
source_project: Kronos
source_paths: [README.md, model/kronos.py]
imported_at: 2026-04-18T00:00:00Z
---

# Kronos: a foundation model for the "language" of financial markets

Kronos (AAAI 2026, arXiv:2508.02739) is the first open-source family of decoder-only foundation models pretrained specifically on financial K-line (candlestick) sequences — `(open, high, low, close, volume, amount)` tuples — gathered from over 45 global exchanges. The project's thesis is that financial data has distinctive non-stationary, high-noise characteristics that generic time-series foundation models do not handle well; a model purpose-built for candles, with a discrete tokenizer and LLM-style autoregressive training, performs better on downstream forecasting and signal-generation tasks.

The project ships:
- A **tokenizer family** (`Kronos-Tokenizer-2k`, `Kronos-Tokenizer-base`) that quantizes each OHLCV step into hierarchical discrete tokens using Binary Spherical Quantization (BSQ).
- A **predictor family** with four sizes: `Kronos-mini` (4.1M, 2048-ctx), `Kronos-small` (24.7M, 512-ctx), `Kronos-base` (102.3M, 512-ctx), and the non-released `Kronos-large` (499.2M).
- A `KronosPredictor` wrapper that handles normalization, AR sampling (temperature, top-k, top-p), per-series denormalization, and single-or-batch prediction.
- Two fine-tuning pipelines: `finetune/` (Qlib-based CN A-share demo with backtest) and `finetune_csv/` (generic CSV with YAML config and DDP support).
- A Flask `webui/` app that loads the model from the Hugging Face Hub and serves interactive candlestick predictions.

Public links:
- GitHub: https://github.com/shiyu-coder/Kronos
- Paper: https://arxiv.org/abs/2508.02739
- Model zoo on Hugging Face: https://huggingface.co/NeoQuasar
- Live demo (24h BTC/USDT forecast): https://shiyu-coder.github.io/Kronos-demo/

Kronos is useful as a reference implementation for anyone building foundation models over multivariate continuous sequences — many of its patterns (BSQ hierarchical tokens, dual-head dependency-aware decoder, rolling-context AR inference) generalize well beyond finance.
