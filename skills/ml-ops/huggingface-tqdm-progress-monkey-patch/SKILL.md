---
name: huggingface-tqdm-progress-monkey-patch
description: Report HuggingFace Hub download progress to a custom UI by intercepting tqdm without touching the caller's code paths.
category: ml-ops
version: 1.0.0
version_origin: extracted
tags: [huggingface, tqdm, progress, monkey-patch, sse]
source_type: extracted-from-git
source_url: https://github.com/jamiepine/voicebox.git
source_ref: main
source_commit: 476abe07fc2c1587f4b3e3916134018ebacd143d
source_project: voicebox
confidence: high
imported_at: 2026-04-18T00:00:00Z
---

# HuggingFace tqdm progress monkey-patch

## When to use
You call `snapshot_download` / `hf_hub_download` (or `from_pretrained` which calls them) from a non-terminal context — a FastAPI worker, Tauri sidecar, embedded daemon — and need a real-time progress signal for the UI. HF Hub has no official progress callback; all it does is instantiate `tqdm` instances internally.

## Steps
1. Keep references to both the original `tqdm.tqdm` class and `tqdm.auto.tqdm`. The HF stack imports through `from tqdm.auto import tqdm as base_tqdm`, so replacing only `tqdm.tqdm` misses most call sites.
2. Subclass the original `tqdm` class. In `__init__`, filter the incoming `**kwargs` against the real tqdm-accepted kwargs whitelist (HF sometimes passes custom unknown kwargs that tqdm rejects) and force `disable=False` so `self.n` continues to update even when there is no terminal.
3. Override `update(n=1)` to call `super().update(n)` and then push `(current=self.n, total=self.total, filename=desc)` to your progress callback. Use a threading lock around the shared state — HF Hub downloads run on worker threads.
4. Also patch `huggingface_hub.utils.tqdm.tqdm.update` directly. HF defines its own `tqdm` subclass at import time; by the time your monkey-patch runs, that subclass reference already exists, so class-level replacement misses it.
5. Walk `sys.modules` and replace all attributes named `tqdm`, `base_tqdm`, `old_tqdm` that point to the original tqdm class. Some modules (incl. `huggingface_hub.file_download`) captured their own reference at import time.
6. Filter noisy bars: skip any `desc` that starts with "Fetching" (it counts files, not bytes, so mixing it with byte progress produces absurd percentages). Skip until the aggregated `total` exceeds a minimum threshold (e.g. 1 MB) so tiny config files don't publish a spurious "100% at 0 bytes" update.
7. Expose the patch as a context manager that saves every original reference in `__enter__` and restores them all in `__exit__` (including `huggingface_hub.utils.tqdm.tqdm.update`).

## Counter / Caveats
- You are intercepting a third-party progress bar. Each HF Hub major version may shift where tqdm is imported from — keep an integration test that pins the observed attribute names.
- Never re-raise from inside the `update` override; a raised exception inside `tqdm.update` becomes an unreachable crash inside the download thread.
- When the model is fully cached, HF still instantiates non-byte tqdms for internal processing. Gate callback delivery on "desc has a model-file extension" and/or a `filter_non_downloads` flag if you want cached loads to stay silent.
- Use queue-based backpressure for the SSE/WebSocket consumer; emitting a callback for every tqdm tick will hammer the transport.

Source references: `backend/utils/hf_progress.py`, `backend/utils/progress.py`.
