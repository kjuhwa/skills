---
version: 0.1.0-draft
name: skip-implicit-fetch-on-hotpath
description: "Don't `git fetch` (or any network call) implicitly on every CLI invocation. Move staleness detection to an explicit `doctor`/`status` command, and expose `--refresh` as opt-in. Network on the hot path is the single biggest contributor to perceived CLI slowness."
type: knowledge
category: decision
source:
  kind: session
  ref: skills-hub bootstrap v2.6.3 /hub-install optimization 2026-04-19
confidence: high
tags: [cli-performance, network-hotpath, staleness-detection, git-fetch, architecture-decision]
linked_skills: []
---

## Fact

**Rule.** A CLI that reads from a local cache of a git-backed registry must NOT auto-fetch the upstream on every command. Staleness checks belong in a dedicated `doctor`/`status` command; users who know they want fresh data opt in via an explicit `--refresh` flag.

**Why:** Implicit fetch is the top contributor to "this CLI feels slow" feedback, even on fast networks. Every invocation pays a TCP round-trip (`git fetch` is ~200–800 ms on a warm LAN, ~1.5–4 s on spotty wi-fi, timeouts when offline). The cost compounds: script wrappers running N commands pay N fetches, and demo recordings end up with visible "waiting…" pauses.

**How to apply:** Pick one of these two strategies — never silent auto-fetch.

1. **On-write only.** Fetch/pull only when the user explicitly mutates (`sync`, `refresh`, `update`). Read paths (`list`, `search`, `install`, `show`) use the current working-tree state of the local cache.
2. **Staleness report, not action.** A `doctor` or `status` command compares local cache mtime to upstream HEAD and reports the gap ("your cache is 3 days behind main"). It does *not* silently fix it. The user decides when to pay the network cost.

## Why

The instinct to "keep the cache fresh automatically" conflates two separate concerns:

- **Correctness** — is the data I'm reading consistent with some point-in-time snapshot? Yes, always, because git trees are immutable.
- **Recency** — is the snapshot as fresh as possible? Sometimes necessary, often not. `list`, `search`, `show` don't need today's data; they need *coherent* data.

Auto-fetching on every command optimizes for recency at 100% of commands when recency only matters at 1% of them. Meanwhile, every command pays the latency tax.

The concrete numbers from skills-hub v2.6.2 → v2.6.3:

| Scenario | v2.6.2 (auto-fetch if cache >1h old) | v2.6.3 (never auto-fetch) |
|---|---|---|
| First `/hub-install` of the day | ~2.5 s (fetch + install) | ~0.3 s (install) |
| Offline (e.g., on a flight) | fails with network error | works against local cache |
| Demo GIF (4-step walkthrough) | visible 2 s pause per step | instant |
| User ran `/hub-sync` 10 min ago | 0 ms (within 1h window) | 0 ms |

The 1-hour window was a band-aid. v2.6.3 removes the band-aid: local reads are always instant, and a separate explicit `--refresh` (or `/hub-sync`) handles the rare case where the user *knows* they need fresh data.

## How to apply

Concrete rules when designing a new command in this class of CLI:

1. **Read commands never fetch.** `search`, `list`, `show`, `install`, `find` — all read the current cache as-is.
2. **One dedicated fetch command.** `sync`, `update`, or `refresh` — this is the only command that pulls from upstream. Document it prominently.
3. **Doctor reports staleness.** A diagnostic command computes `git log --oneline HEAD..origin/HEAD | wc -l` (or mtime delta if the cache hasn't been fetched at all) and reports the gap in the summary. It does not mutate.
4. **`--refresh` flag as opt-in.** Any read command can accept `--refresh` to do an inline fetch before executing, for users who want "freshest possible" once. Default stays fast.
5. **Tell the user about staleness in the doctor output**, not in the read commands' output — read commands should never carry a "by the way, you might be stale" warning, because that puts latency back on the hot path.

Corollary: if you find yourself writing `if (cache_age > THRESHOLD) fetch()`, delete it. That's the anti-pattern. The correct shape is `if (user passed --refresh) fetch()`.

## Evidence

Skills-hub `/hub-install` pre-v2.6.3 had this exact pattern:

```
- If present and older than 1h: `git fetch --tags --prune origin` then `git pull --ff-only`
```

User feedback after recording a demo: "install 이 너무 느리고" ("install is too slow"). Root cause: every command paid the fetch tax even though the user had pulled 30 minutes earlier via `/hub-sync`.

v2.6.3 deleted the 1h auto-fetch, moved staleness reporting to `/hub-doctor` check 9 (indexes freshness), and added `--refresh` as an opt-in flag. Install latency dropped from ~2.5 s to ~0.3 s for the first-of-day call. No user complaints about staleness since — because the `/hub-doctor` report surfaces it cleanly when users explicitly check.

## Counter / Caveats

- **Online-only tools**: if the tool fundamentally cannot work without network access (e.g., pure API clients with no local cache), this rule is moot — you fetch on every call by definition. The rule is about tools that *have* a cache and are choosing whether to refresh it.
- **Security-critical caches** (e.g., signature trust stores, cert pinning data) may need mandatory freshness checks. That's fine, but make the freshness check cheap and *inline* (HEAD request, ETag match) rather than a full `git fetch`. And measure it — even "cheap" network calls dominate local-only operations.
- **Multi-user shared caches**: if multiple processes write the cache, auto-fetch becomes unsafe (race conditions). Single-user local caches don't have this constraint.
