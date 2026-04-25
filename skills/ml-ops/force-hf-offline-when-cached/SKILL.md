---
name: force-hf-offline-when-cached
description: Force HF_HUB_OFFLINE=1 while loading a fully-cached model so transformers / mlx_audio don't make network calls on every startup.
category: ml-ops
version: 1.0.0
version_origin: extracted
tags: [huggingface, offline, caching, desktop-ml, startup-time]
source_type: extracted-from-git
source_url: https://github.com/jamiepine/voicebox.git
source_ref: main
source_commit: 476abe07fc2c1587f4b3e3916134018ebacd143d
source_project: voicebox
confidence: high
imported_at: 2026-04-18T00:00:00Z
---

# Force HF offline when cached

## When to use
A desktop or embedded app loads models via `transformers.from_pretrained` / `mlx_audio` / `huggingface_hub.snapshot_download`. Even when the model is fully cached, these libraries make head/etag HEAD requests on every load — slow on bad networks, broken behind corporate proxies, and sometimes breaks completely offline.

## Steps
1. Before loading, check cache residency yourself: walk `HF_HUB_CACHE/models--<org>--<repo>/` and confirm the expected weight files exist. Consider the model "cached" only when the full file set is present, not just `config.json`.
2. Wrap the load call with a context manager that sets `os.environ["HF_HUB_OFFLINE"] = "1"` on entry and restores the prior value on exit. This forces the whole HF stack into offline mode for the load.
3. Also monkey-patch `huggingface_hub.file_download._try_to_load_from_cache` with a wrapper that logs cache hits/misses with the expected path — invaluable for diagnosing "why is it downloading again" bugs in user reports.
4. When only a MLX/community repo is cached but the library asks for the original upstream repo, create a filesystem symlink from `models--<upstream>--<repo>` → `models--<mlx>--<repo>` so the config lookup succeeds without a network call.
5. Catch any load exception whose message contains "offline" and retry once **with** network access (i.e. restore the original env, then call again). This handles partial-cache states where one small config file was never fetched.
6. Gate the entire patch behind an env var (e.g. `VOICEBOX_OFFLINE_PATCH=1`) so users with unusual setups can opt out without a rebuild.

## Counter / Caveats
- Do not force offline mode globally at process start — only for the specific load call. Other parts of the app (token validation, dataset fetch) may legitimately need network.
- Never silently swallow the offline-mode retry failure. If both offline and online loads fail, surface the original offline exception — it usually points at the missing file.
- Symlink trick only works when the cached fork is a true drop-in (same config, same tokenizer). Verify manually before wiring it up.
- Test the patch path by pointing `HF_HUB_CACHE` at a temp directory that you know is empty; it should cleanly fall through to online mode.

Source references: `backend/utils/hf_offline_patch.py`.
