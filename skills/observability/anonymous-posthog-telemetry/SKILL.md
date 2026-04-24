---
name: anonymous-posthog-telemetry
description: Ship anonymous PostHog telemetry from an OSS CLI using an embedded write-only key, a silentFetch wrapper that masks SDK stderr noise, DO_NOT_TRACK / per-tool opt-out, and `$process_person_profile: false` to stay in PostHog's anonymous tier.
category: observability
version: 1.0.0
version_origin: extracted
tags: [telemetry, posthog, opt-out, privacy, cli]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/coleam00/Archon.git
source_ref: dev
source_commit: d89bc767d291f52687beea91c9fcf155459be0d9
source_project: Archon
imported_at: 2026-04-18T00:00:00Z
---

# Anonymous, Opt-Out, No-Noise PostHog Telemetry for OSS CLIs

## When to use

- You ship an open-source CLI and want **a single metric** (e.g. "this command was invoked") to measure usage, not user behavior.
- You cannot require users to provide a PostHog key, but you don't want to collect PII or build person profiles.
- Network failures (offline, firewall, DNS broken, rate-limited) must not spam the user's terminal with stderr noise — telemetry is strictly fire-and-forget.

## Steps

1. **Embed a write-only PostHog project key** (`phc_*`) as a default. These keys can only write events, never read data — safe to ship in source. Allow override via `POSTHOG_API_KEY` env var (for self-hosted PostHog).
2. **Respect these opt-outs** (any one disables telemetry):
   - `<TOOL>_TELEMETRY_DISABLED=1` (your tool-specific var)
   - `DO_NOT_TRACK=1` (de facto standard across OSS tools)
   - `POSTHOG_API_KEY` unset **and** no embedded default

   Check them in an exported `isTelemetryDisabled()` so callers / tests can short-circuit before spinning up the client.

3. **Generate and persist a stable anonymous install UUID**. Read `~/.<tool>/telemetry-id` if present, else `randomUUID()` and write. On read/write failure, use an ephemeral UUID for this session (telemetry still works, just not correlated across runs). Never prompt, never fail.

4. **Stay in PostHog's anonymous tier.** On every `capture()`, include `$process_person_profile: false` in the properties. This disables person profile creation — events count for metrics but don't create a "user" entity. See PostHog docs on anonymous events.

5. **Wrap the SDK's `fetch` with a `silentFetch` that masks all errors as 200 responses.** PostHog-node's internal `logFlushError` writes to stderr via `console.error` on any network error, bypassing your logger configuration. Intercept first:

   ```ts
   const FAKE_OK = { status: 200, text: () => Promise.resolve('{}'), json: () => Promise.resolve({}), headers: { get: () => null } };
   async function silentFetch(url, options) {
     try {
       const res = await fetch(url, options);
       if (res.status < 200 || res.status >= 400) return FAKE_OK;
       return res;
     } catch { return FAKE_OK; }
   }
   ```

   Log the original error at **debug** level so it's discoverable but not user-visible. Pass `silentFetch` via the PostHog constructor's `fetch` option.

6. **Hook the client-level error channel too** (`client.on('error', …)`) — future SDK versions may route errors there instead of (or in addition to) `console.error`. Log at debug.

7. **Set `disableGeoip: true`, `flushAt: 20`, `flushInterval: 10000`.** Geo-IP is enrichment you don't need; flushAt/Interval keep capture latency low while batching.

8. **Make every `capture*` function fire-and-forget.**
   ```ts
   export function captureWorkflowInvoked(props) {
     if (isTelemetryDisabled()) return;
     void (async () => { try { const c = await getClient(); c?.capture({...}); } catch {} })();
   }
   ```
   Synchronous return, async IIFE inside, no user-visible failure path.

9. **Implement `shutdownTelemetry()`** for process exit (SIGTERM, CLI completion) that `await client.shutdown()` to flush pending batches, with a try/catch and internal state reset for test reuse.

10. **Trim potentially-unbounded fields** (workflow descriptions, user messages). Archon caps `workflow_description` at 500 chars.

## Counter / Caveats

- **Don't** capture anything that could be PII: command arguments, file paths with usernames, chat messages, repo names. Archon captures only `workflow_name`, optional `workflow_description` (trimmed, authored by the tool author not the user), `platform`, `archon_version`.
- Think hard about per-command telemetry: aggregating is fine, but a user-typed workflow name might contain unintended identifiers. If in doubt, bucket into a fixed enum.
- Document telemetry prominently in your README — opt-in/opt-out transparency is non-negotiable for OSS.
- The `phc_*` key limits write-volume server-side; PostHog itself enforces rate-limits. Don't worry about "abuse" of the key beyond normal operation.

## Evidence

- `packages/paths/src/telemetry.ts` (247 lines): full implementation.
  - Embedded key + opt-outs: lines 42-75.
  - `getOrCreateTelemetryId` with read/write fallbacks: lines 87-106.
  - `silentFetch` + `FAKE_OK_RESPONSE`: lines 137-159.
  - PostHog init with `disableGeoip`, `flushAt: 20`, `flushInterval: 10000`, custom `fetch`: lines 161-183.
  - `client.on('error', …)` defensive hook: lines 175-177.
  - `$process_person_profile: false` in capture: line 207.
  - Fire-and-forget `captureWorkflowInvoked`: lines 196-218.
  - `shutdownTelemetry`: lines 225-237.
  - 500-char description trim: `DESCRIPTION_MAX_LENGTH` constant at line 50.
- Commit SHA: d89bc767d291f52687beea91c9fcf155459be0d9.
