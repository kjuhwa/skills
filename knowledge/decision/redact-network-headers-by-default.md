---
version: 0.1.0-draft
name: redact-network-headers-by-default
summary: Network request formatters default to redacting headers (`redactNetworkHeaders: true`) because cookies, Authorization, API keys live there; users opt into raw headers explicitly for debugging auth flows.
category: decision
confidence: medium
tags: [privacy, network, redaction, headers, security]
source_type: extracted-from-git
source_url: https://github.com/ChromeDevTools/chrome-devtools-mcp.git
source_ref: main
source_commit: 0a6aaa52ebacb2db834ffa437863e5844aa3730b
source_project: chrome-devtools-mcp
source_path: src/McpResponse.ts
imported_at: 2026-04-18T00:00:00Z
---

# Redact Network Headers By Default

## Context

A tool that returns network request details is a convenient debugging aid and a privacy leak rolled together. Request and response headers routinely carry cookies, Authorization bearer tokens, API keys, CSRF tokens, and PII-containing headers. Returning them to an LLM that logs its chain-of-thought, caches responses, or uploads context to third-party services is a real risk.

## The fact / decision / pitfall

chrome-devtools-mcp's `McpResponse` sets `#redactNetworkHeaders = true` by default and passes it through to every `NetworkFormatter`:

```ts
#redactNetworkHeaders = true;
setRedactNetworkHeaders(value: boolean): void {
  this.#redactNetworkHeaders = value;
}
```

The CLI `--redact-network-headers` flag is on by default (set at startup via `response.setRedactNetworkHeaders(serverArgs.redactNetworkHeaders)`). Opt-out with `--no-redact-network-headers` for debugging auth flows, but explicitly.

## Evidence

- `src/McpResponse.ts` — default true and the setter.
- `src/index.ts` — `response.setRedactNetworkHeaders(serverArgs.redactNetworkHeaders);` wiring the CLI flag through.
- `src/formatters/NetworkFormatter.ts` — takes `redactNetworkHeaders` via constructor options and conditionally omits/redacts header values in output.

## Implications

- Secure defaults for debug tools should be opt-in-insecurity. The cost of opt-in is one flag; the cost of opt-out-after-leak is real.
- This principle generalizes to any "show me what happened" tool: database queries (redact rows?), HTTP capture (redact bodies?), environment inspection (redact env vars?).
- Even redacted, the *presence* of an Authorization header is informative. Emit `Authorization: <redacted>` so agents know auth was sent without exposing the token.
- Document the flag prominently. Users debugging an auth flow will waste hours if they don't know redaction is on.
