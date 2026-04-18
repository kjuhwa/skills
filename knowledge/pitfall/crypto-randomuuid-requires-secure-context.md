---
version: 0.1.0-draft
tags: [pitfall, crypto, randomuuid, requires, secure, context]
name: crypto-randomuuid-requires-secure-context
description: "`crypto.randomUUID()` is only defined in secure contexts (HTTPS or localhost); plain-HTTP dev or intranet deployments need an explicit UUID fallback."
category: pitfall
confidence: high
source:
  kind: project
  ref: lucida-ui@d19f537f0f
---

# Fact

`window.crypto.randomUUID()` is only available in a [secure context](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts): HTTPS pages and `http://localhost`. On plain HTTP origins (internal IP dev servers, intranet deployments without TLS) the call throws or returns undefined, crashing features that relied on it for request IDs, SSE stream IDs, or client-side keys.

# Why

Browser vendors restricted crypto APIs to secure contexts to prevent passive eavesdroppers from biasing or observing key material. The restriction is enforced per-origin and cannot be toggled from JS.

# How to apply

- Wherever `crypto.randomUUID()` is called, wrap with a fallback:
  ```ts
  const uuid = () =>
    (globalThis.crypto?.randomUUID?.()) ??
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0
      const v = c === 'x' ? r : (r & 0x3) | 0x8
      return v.toString(16)
    })
  ```
- Before using crypto APIs in new code, check the deployment surface. If any environment ships over plain HTTP, treat `crypto.*` as optional.
- For true security needs (tokens, signing) plain-HTTP fallback is insufficient — escalate to fixing the TLS story instead of polyfilling.

# Counter / Caveats

- In CI / tests running on `localhost`, `crypto.randomUUID()` works — bugs only surface on deploy.
- Node 19+ also ships `crypto.randomUUID`, but `globalThis.crypto` guarding keeps the same code running in SSR.
