---
version: 0.1.0-draft
name: dflash-block-diffusion-overview
summary: DFlash is a block-diffusion draft model for speculative decoding — drafts a whole block of tokens in parallel using target hidden states as cross-context, then a single target forward verifies them.
category: llm-agents
tags: [speculative-decoding, block-diffusion, draft-model, dflash]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/z-lab/dflash.git
source_ref: main
source_commit: 1fe684b00efba56490d920d15eeb9ba6e4471751
source_project: dflash
source_path: README.md
imported_at: 2026-04-18T00:00:00Z
---

# DFlash: block diffusion for speculative decoding

## What it is
DFlash is a *small* transformer that drafts `block_size` tokens at once, in parallel, conditioned on hidden states from selected layers of a *target* LLM. One target forward then verifies the entire block, accepting the longest matching prefix plus one bonus target token.

- Paper: https://arxiv.org/abs/2602.06036
- Blog: https://z-lab.ai/projects/dflash/
- Repo: https://github.com/z-lab/dflash

## Why "block diffusion"
Classical speculative decoding drafts tokens *autoregressively* from a small model — each draft token depends on the previous one. DFlash instead predicts all `block_size - 1` positions from a `[last_accepted, MASK, MASK, ...]` input in one forward pass, analogous to masked diffusion denoising. The draft model architecture (Qwen3 block, rotary emb, RMSNorm) is re-used from the target family but trained bidirectionally (`is_causal=False`).

## Architecture fingerprints
- Draft concatenates target hidden states from `target_layer_ids` (interpolated across target depth) and projects them down via an `nn.Linear(concat_dim, hidden_size)`.
- Draft shares `embed_tokens` and `lm_head` with the target at inference (via `bind()`), so the deployed draft checkpoint is only the transformer body + `fc` projector.
- Mask token is per-model (`config.dflash_config.mask_token_id`).

## Supported backends
| Backend | Status | Notes |
|---|---|---|
| vLLM | nightly | `--speculative-config '{"method": "dflash", ...}'` |
| SGLang | in-tree | `--speculative-algorithm DFLASH` |
| HF Transformers | limited | Qwen3 and Llama-3.1-8B-Instruct only |
| MLX (Apple) | experimental | incl. sliding-window draft KV |

## Why this matters for your work
- The verify + accept loop is generic and reusable for any block-parallel draft.
- The MLX implementation is the only one in the ecosystem that does KV rollback for Gated-Delta-Net (non-trimmable) caches — worth studying if you target Qwen3.5 MoE.
- Default target-layer interpolation (`[1, ..., num_target_layers - 3]`) is a usable heuristic when you don't have a trained layer map.
