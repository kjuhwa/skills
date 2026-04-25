---
name: draft-model-bind-to-target-modules
description: Share embed_tokens and lm_head from the target LLM into a draft model at runtime by duck-typing the wrapper layout, so the draft does not ship its own embedding matrix.
category: llm-agents
version: 1.0.0
version_origin: extracted
tags: [speculative-decoding, weight-sharing, huggingface, mlx, embeddings]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/z-lab/dflash.git
source_ref: main
source_commit: 1fe684b00efba56490d920d15eeb9ba6e4471751
source_project: dflash
source_path: dflash/model_mlx.py
imported_at: 2026-04-18T00:00:00Z
---

# Draft Model → Target Module Binding

## When to use
- You train a draft / speculative / LoRA head model and want to avoid shipping the target's embedding and output projection (which can be hundreds of MB).
- You need to support several target wrappers (`CausalLM`, multimodal `language_model`, MLX `mlx_lm` models) without hard-coding attribute paths.
- You want a one-call `bind(target)` that populates `self.embed_tokens` and `self.lm_head` on the draft.

## Pattern

```python
def bind(self, target_model):
    # Walk known wrapper layouts to find inner transformer.
    if hasattr(target_model, "embed_tokens"):
        inner = target_model
    elif hasattr(target_model, "model") and hasattr(target_model.model, "embed_tokens"):
        inner = target_model.model
    elif (hasattr(target_model, "language_model")
          and hasattr(target_model.language_model, "model")
          and hasattr(target_model.language_model.model, "embed_tokens")):
        inner = target_model.language_model.model
    else:
        raise AttributeError(f"Cannot find embed_tokens in {type(target_model).__name__}")

    self.embed_tokens = inner.embed_tokens

    # lm_head: prefer explicit head, fall back to tied embeddings (`as_linear`).
    lm = getattr(target_model, "language_model", target_model)
    self.lm_head = (
        getattr(target_model, "lm_head", None)
        or getattr(lm, "lm_head", None)
        or self.embed_tokens.as_linear        # tied weights case
    )
    return self
```

## Why three branches
1. `AutoModelForCausalLM` — target is already the inner transformer + head, `embed_tokens` sits at `target.embed_tokens` or `target.model.embed_tokens` depending on the architecture.
2. `LlavaForConditionalGeneration` / VLM wrappers — the LLM is nested under `.language_model.model`.
3. Plain `mlx_lm` transformer — exposes `embed_tokens` at the top level.

## Tied-weight fallback
`self.embed_tokens.as_linear` turns a tied embedding matrix into an `nn.Linear` view so logits computation still works when `lm_head is None`. This is common for MLX models and some Qwen variants.

## Gotchas
- Call `bind()` *after* the target is loaded and before the first draft forward — binding attaches live module references, not copies.
- If you later move the target to another device/dtype, the draft sees it automatically because the attributes are references; you do not need to re-bind.
- Do not call `bind()` twice with different targets — `self.embed_tokens` would dangle on the old target when you drop it.
