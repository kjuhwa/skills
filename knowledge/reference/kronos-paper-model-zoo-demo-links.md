---
version: 0.1.0-draft
name: kronos-paper-model-zoo-demo-links
summary: External pointers for Kronos — the AAAI 2026 paper, Hugging Face model zoo, live BTC/USDT demo, and the companion fine-tuning repos.
category: reference
tags: [kronos, reference, paper, huggingface, model-zoo, demo, links]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/shiyu-coder/Kronos.git
source_ref: master
source_commit: 67b630e67f6a18c9e9be918d9b4337c960db1e9a
source_project: Kronos
source_paths: [README.md]
imported_at: 2026-04-18T00:00:00Z
---

# Kronos — external references

| Resource | URL |
|---|---|
| GitHub repo | https://github.com/shiyu-coder/Kronos |
| Paper (arXiv 2508.02739, AAAI 2026) | https://arxiv.org/abs/2508.02739 |
| Hugging Face org (NeoQuasar) | https://huggingface.co/NeoQuasar |
| Live demo (24h BTC/USDT) | https://shiyu-coder.github.io/Kronos-demo/ |

**Model checkpoints on the Hub** (all use `from_pretrained` via `PyTorchModelHubMixin`):

| Model | Tokenizer | Params | Max context | Notes |
|---|---|---|---|---|
| `NeoQuasar/Kronos-mini` | `NeoQuasar/Kronos-Tokenizer-2k` | 4.1 M | 2048 | Lightweight, fastest inference |
| `NeoQuasar/Kronos-small` | `NeoQuasar/Kronos-Tokenizer-base` | 24.7 M | 512 | Recommended starting point |
| `NeoQuasar/Kronos-base` | `NeoQuasar/Kronos-Tokenizer-base` | 102.3 M | 512 | Better quality, same context |
| `NeoQuasar/Kronos-large` | `NeoQuasar/Kronos-Tokenizer-base` | 499.2 M | 512 | Not publicly released |

**Referenced papers:**
- Kronos (this work): Shi et al., 2025. https://arxiv.org/abs/2508.02739
- Binary Spherical Quantization: Zhao et al., 2024. https://arxiv.org/pdf/2406.07548.pdf
- Nucleus (top-p) sampling: Holtzman et al., 2019. https://arxiv.org/abs/1904.09751
- Soft entropy loss reference: https://arxiv.org/pdf/1911.05894.pdf

**Related tooling the repo uses:**
- [Qlib](https://github.com/microsoft/qlib) — Microsoft's A-share quant research framework, used in `finetune/` for data prep and backtest.
- [Comet ML](https://www.comet.com/) — optional experiment tracker, toggled via `use_comet`.
- [huggingface_hub](https://huggingface.co/docs/huggingface_hub) — `PyTorchModelHubMixin` for `from_pretrained` / `save_pretrained`.

When citing the model:

```bibtex
@misc{shi2025kronos,
  title={Kronos: A Foundation Model for the Language of Financial Markets},
  author={Yu Shi and Zongliang Fu and Shuo Chen and Bohan Zhao and Wei Xu and Changshui Zhang and Jian Li},
  year={2025},
  eprint={2508.02739},
  archivePrefix={arXiv},
  primaryClass={q-fin.ST},
  url={https://arxiv.org/abs/2508.02739}
}
```
