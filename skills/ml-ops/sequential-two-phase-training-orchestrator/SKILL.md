---
name: sequential-two-phase-training-orchestrator
description: Drive a two-phase training pipeline (e.g. tokenizer then predictor) with one command, CLI skip flags, and auto-skip if an earlier phase's best_model already exists.
category: ml-ops
tags: [training-pipeline, orchestrator, cli, resume, skip-existing, ml-workflow]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/shiyu-coder/Kronos.git
source_ref: master
source_commit: 67b630e67f6a18c9e9be918d9b4337c960db1e9a
source_project: Kronos
source_paths: [finetune_csv/train_sequential.py, finetune_csv/config_loader.py]
version: 1.0.0
version_origin: extracted
imported_at: 2026-04-18T00:00:00Z
---

# One-command orchestrator for multi-phase training with skip/resume

## When to use
- Your pipeline has ordered phases (tokenizer → base model; pretrain → fine-tune; encoder → decoder).
- Phase N depends on phase N-1's `best_model` checkpoint.
- You want `--skip-tokenizer`, `--skip-basemodel`, `--skip-existing` flags so users can rerun only the part they changed.

## Pattern
Wrap each phase in a method (`train_tokenizer_phase`, `train_basemodel_phase`) that (1) checks `os.path.exists(best_model_path)` and bails out early if `skip_existing` is on, (2) sets up its own logger and seed, (3) loads the previous phase's artifact, (4) delegates to the actual training function. A top-level `run_training()` calls them in order, short-circuits on failure, prints total wall-time, and handles DDP init/teardown once for the whole pipeline. Expose every skip as a CLI flag plus a config boolean.

```python
# finetune_csv/train_sequential.py
class SequentialTrainer:
    def _check_existing_models(self):
        return (os.path.exists(self.config.tokenizer_best_model_path),
                os.path.exists(self.config.basemodel_best_model_path))

    def train_tokenizer_phase(self):
        tok_exists, _ = self._check_existing_models()
        if tok_exists and self.config.skip_existing:
            print("Tokenizer already trained, skipping."); return True
        tokenizer = KronosTokenizer.from_pretrained(self.config.pretrained_tokenizer_path).to(self.device)
        train_tokenizer(tokenizer, self.device, self.config, self.config.tokenizer_save_path, logger)
        return True

    def train_basemodel_phase(self):
        if not os.path.exists(self.config.finetuned_tokenizer_path):
            raise FileNotFoundError("Fine-tuned tokenizer missing — run tokenizer phase first")
        tokenizer = KronosTokenizer.from_pretrained(self.config.finetuned_tokenizer_path).to(self.device)
        model     = Kronos.from_pretrained(self.config.pretrained_predictor_path).to(self.device)
        train_model(model, tokenizer, self.device, self.config, self.config.basemodel_save_path, logger)
        return True

    def run_training(self):
        if self.config.train_tokenizer and not self.train_tokenizer_phase(): return False
        if self.config.train_basemodel and not self.train_basemodel_phase(): return False
        return True

# CLI
parser.add_argument('--skip-tokenizer', action='store_true')
parser.add_argument('--skip-basemodel', action='store_true')
parser.add_argument('--skip-existing',  action='store_true')
```

## Why it works / tradeoffs
One orchestrator script means the invariant "tokenizer before predictor" lives in code, not in a README. CLI skip flags make re-running a single failed phase cheap. The hard guard that phase N verifies phase N-1's artifact catches the common error of running only phase 2 with the wrong pretrained tokenizer path. Tradeoff: coupling phases into one process forbids running them on different machines without refactoring; if that matters, split each phase into its own entry point and have the orchestrator call them via subprocess / Airflow / Make.

## References
- `finetune_csv/train_sequential.py` in Kronos — `SequentialTrainer`
- `finetune_csv/config_loader.py` — `CustomFinetuneConfig._compute_full_paths` computes `tokenizer_best_model_path`, `basemodel_best_model_path`
