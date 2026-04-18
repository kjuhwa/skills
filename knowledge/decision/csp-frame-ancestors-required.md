---
name: csp-frame-ancestors-required
version: 0.1.0-draft
tags: [decision, csp, frame, ancestors, required]
category: decision
summary: Send a Content-Security-Policy header (including `frame-ancestors`) on every response to block clickjacking
source:
  kind: project
  ref: cygnus@cbb96a6dfff
confidence: high
---

# Content-Security-Policy Header Required

## Fact
A `content.security.policy` value is configured and emitted on responses. The policy includes `frame-ancestors` to restrict which origins may embed the app in an iframe.

## Why
Without `frame-ancestors` (or legacy `X-Frame-Options`), admin pages can be iframed by a malicious origin and clickjacked. Enterprise customers increasingly require CSP as a contractual security baseline.

## How to apply
- Keep the `content.security.policy` config populated; never ship empty.
- When integrating with a new partner portal that needs to embed the product, extend `frame-ancestors` with that specific origin — do not fall back to `*`.
- Add CSP violations to the security-log review checklist.
