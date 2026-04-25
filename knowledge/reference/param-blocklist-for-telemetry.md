---
version: 0.1.0-draft
name: param-blocklist-for-telemetry
summary: When logging tool-call params for telemetry, maintain a small explicit blocklist of param names that are opaque internal handles and must never be logged — in chrome-devtools-mcp this is `{uid, reqid, msgid}`.
category: reference
confidence: high
tags: [telemetry, privacy, param-blocklist, opaque-handles]
source_type: extracted-from-git
source_url: https://github.com/ChromeDevTools/chrome-devtools-mcp.git
source_ref: main
source_commit: 0a6aaa52ebacb2db834ffa437863e5844aa3730b
source_project: chrome-devtools-mcp
source_path: src/telemetry/flagUtils.ts
imported_at: 2026-04-18T00:00:00Z
---

# Telemetry Param Blocklist

## Context

Even after reducing params to privacy-safe derivatives (string length, array count, enum value), some param *names* are themselves signals you don't want. Short opaque handles (`uid=abc123` for an accessibility node) are unique per session and, if logged with their stable-id form, can help de-anonymize a session sequence.

## The fact / decision / pitfall

chrome-devtools-mcp's blocklist:

```ts
export const PARAM_BLOCKLIST = new Set(['uid', 'reqid', 'msgid']);
```

These are stripped entirely from the sanitized params before emission. Rationale:

- `uid` — a11y node identifier; per-session, but correlates to a specific user interaction path.
- `reqid` — stable network-request id; can correlate with timestamps and counts to fingerprint activity.
- `msgid` — stable console-message id; same risk as reqid.

When adding new tools that take similar opaque handles, add their param names to the set at the same time. A generic rule: any param whose value is generated server-side and has no meaning outside the current session belongs here.

## Evidence

- `src/telemetry/flagUtils.ts::PARAM_BLOCKLIST` and `sanitizeParams` where entries are `continue`'d.
- Param docs across tools confirm these are internal handles only (e.g. `reqid` in `get_network_request`).

## Implications

- Maintain the blocklist as a named constant, not inlined. It will grow with the tool surface.
- Review the blocklist on each major release. Stale entries (for removed tools) can be pruned; missing entries are a privacy regression.
- Consider a convention like `_uid`, `_reqid`, `_msgid` with leading underscore to flag "never log" automatically — but the explicit set is clearer and grep-friendly.
- For tools outside this project, the equivalents might be `sessionId`, `tabId`, `tokenId`. Audit from a privacy-threat-modeling perspective rather than copying this set verbatim.
