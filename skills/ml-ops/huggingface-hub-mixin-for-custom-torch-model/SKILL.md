---
name: huggingface-hub-mixin-for-custom-torch-model
description: Give a custom nn.Module save_pretrained/from_pretrained plus HF Hub push/pull by multiple-inheriting from PyTorchModelHubMixin, with no HuggingFace config boilerplate.
category: ml-ops
tags: [huggingface, pytorch, model-checkpoint, hub, pretrained, serialization]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/shiyu-coder/Kronos.git
source_ref: master
source_commit: 67b630e67f6a18c9e9be918d9b4337c960db1e9a
source_project: Kronos
source_paths: [model/kronos.py, finetune/train_tokenizer.py, tests/test_kronos_regression.py]
version: 1.0.0
version_origin: extracted
imported_at: 2026-04-18T00:00:00Z
---

# Make any nn.Module hub-publishable with PyTorchModelHubMixin

## When to use
- You ship a custom PyTorch model (no tokenizers, no AutoModel) and still want `from_pretrained("user/name")` / `save_pretrained(path)` / `push_to_hub`.
- You don't want to inherit from `transformers.PreTrainedModel` (which brings config classes, `CausalLM`-style heads, etc.).
- You want config-free serialization: constructor kwargs are stored in `config.json` automatically and re-passed on load.

## Pattern
`nn.Module` + `PyTorchModelHubMixin` via multiple inheritance. The mixin intercepts `save_pretrained` to write `model.safetensors` + `config.json` built from the `__init__` signature, and `from_pretrained` reads that config back and calls `__init__` before loading weights.

```python
# model/kronos.py
from huggingface_hub import PyTorchModelHubMixin

class KronosTokenizer(nn.Module, PyTorchModelHubMixin):
    def __init__(self, d_in, d_model, n_heads, ff_dim,
                 n_enc_layers, n_dec_layers, ...,
                 s1_bits, s2_bits, beta, gamma0, gamma, zeta, group_size):
        super().__init__()
        ...

class Kronos(nn.Module, PyTorchModelHubMixin):
    def __init__(self, s1_bits, s2_bits, n_layers, d_model, n_heads, ff_dim, ...):
        super().__init__()
        ...

# use anywhere
tokenizer = KronosTokenizer.from_pretrained("NeoQuasar/Kronos-Tokenizer-base")
model     = Kronos.from_pretrained("NeoQuasar/Kronos-small")

# and when fine-tuning
model.module.save_pretrained(f"{save_dir}/checkpoints/best_model")
```

For deterministic regression tests you can pin a commit hash:

```python
# tests/test_kronos_regression.py
tokenizer = KronosTokenizer.from_pretrained("NeoQuasar/Kronos-Tokenizer-base",
                                            revision="0e0117387f39004a9016484a186a908917e22426")
```

## Why it works / tradeoffs
The mixin inspects `__init__` kwargs via `inspect.signature` and serializes them, so every ctor arg must be JSON-serializable (ints, floats, strings, lists of same). You get Hub push/pull for free including model card. Tradeoffs: no lazy sharding like `from_pretrained(..., device_map="auto")`; if you need that, wrap in `transformers.PreTrainedModel` instead. Also, renaming a ctor kwarg breaks backward compatibility with existing checkpoints — treat the `__init__` signature as a public API.

## References
- `model/kronos.py` in Kronos — `KronosTokenizer(nn.Module, PyTorchModelHubMixin)` and `Kronos(nn.Module, PyTorchModelHubMixin)`
- Hugging Face docs: https://huggingface.co/docs/huggingface_hub/guides/integrations#pytorch
- `tests/test_kronos_regression.py` — pinning `revision=` for deterministic tests
