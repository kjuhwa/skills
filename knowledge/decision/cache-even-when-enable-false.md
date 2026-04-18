---
version: 0.1.0-draft
tags: [decision, cache, even, when, enable, false]
name: cache-even-when-enable-false
category: decision
summary: Notification configs with `enable=false` are still loaded into the cache manager rather than skipped, so toggling enable on/off doesn't require a cache reload
source:
  kind: project
  ref: lucida-notification@release-10.2.4_2
  evidence:
    - "commit 0238745 — '사용 여부(enable)이 false여도 캐시하도록 수정'"
    - "commit 8d3d589 — 'enable false면 return 추가' (the short-circuit check consuming the cached record)"
    - "commit ab47414 — '통보 캐시 매니저 빈으로 사용'"
    - "commit 207701d / 961a364 — '통보 사용여부 캐시 업데이' (cache invalidate on toggle)"
confidence: high
---

## Fact
The cache loader does **not** filter by `enable`. Both enabled and disabled records enter the cache. The enable flag is evaluated *after* cache lookup, so a disabled config's lookup is still O(1) and toggling enable via API only needs to flip the flag + evict that single entry — not rebuild the whole cache.

## Why this was chosen
Before the change (commit `0238745`), enabling a previously-disabled config required a manual cache reload or a wait for TTL — operations kept asking "why isn't it active yet?". Including disabled records makes the cache authoritative and lets the short-circuit on `enable=false` live cheaply at the read site.

## How to apply
- When adding a new cacheable notification config, include all records at load time regardless of `enable`.
- The consumer-side check is `if (!cfg.isEnabled()) return;` — do it at the start of the sender method.
- Cache eviction strategy: evict-on-write for the single key when a toggle API flips enable (see `207701d`). Don't full-invalidate.

## Counter / Caveats
- This is a small-config-set decision. If the config table ever grows past ~10k rows, re-examine — unconditionally caching every row stops being free.
- Don't extend this policy to user-level data caches (user PII) — those still need enable/active filtering to avoid surfacing soft-deleted users.
