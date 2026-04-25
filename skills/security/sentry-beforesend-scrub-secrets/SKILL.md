---
name: sentry-beforesend-scrub-secrets
description: Sentry beforeSend hook that strips authorization headers and any breadcrumb data field whose key name looks like a credential (token/key/secret/password/credential/auth) before events leave the client.
category: security
version: 1.0.0
version_origin: extracted
tags: [sentry, pii, secrets, telemetry, scrubbing]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/lukilabs/craft-agents-oss.git
source_ref: main
source_commit: 61f7d48a5b4fd0a8094f002c9e3aea5f3824dcfb
source_project: craft-agents-oss
source_path: apps/electron/src/main/index.ts
imported_at: 2026-04-18T00:00:00Z
---

# Scrub secrets in Sentry beforeSend

## When to use
- Any app reporting errors / breadcrumbs to Sentry (or similar SaaS).
- Stack traces and breadcrumbs can carry OAuth tokens, API keys, session cookies.
- You need defense in depth — even with careful logging, one `console.log(token)` in a library can leak.

## How it works
1. Register `Sentry.init({ beforeSend(event) { ... return event; } })`.
2. In the hook, walk known high-risk locations:
   - `event.request?.headers`: redact `authorization`, `cookie`, `x-api-key`.
   - `event.breadcrumbs[].data`: for each key, lowercase and check if it contains `token`, `key`, `secret`, `password`, `credential`, or `auth` -> replace value with `'[REDACTED]'`.
3. Return the mutated event.
4. Pair with `Sentry.setUser({ id: hashOf(hostname+homedir) })` so you get per-machine uniqueness without PII (never use email/username).
5. Gate `enabled` on `!!process.env.SENTRY_INGEST_URL` so CI builds without the DSN baked in are auto-disabled.

## Example
```ts
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: !!process.env.SENTRY_DSN,
  beforeSend(event) {
    for (const h of ['authorization', 'cookie', 'x-api-key']) {
      if (event.request?.headers?.[h]) event.request.headers[h] = '[REDACTED]';
    }
    for (const b of event.breadcrumbs ?? []) {
      for (const k of Object.keys(b.data ?? {})) {
        const lk = k.toLowerCase();
        if (['token','key','secret','password','credential','auth'].some(s => lk.includes(s))) {
          b.data![k] = '[REDACTED]';
        }
      }
    }
    return event;
  },
});
Sentry.setUser({ id: createHash('sha256').update(hostname()+homedir()).digest('hex').slice(0,16) });
```

## Gotchas
- This catches the common cases but NOT values embedded in free-form strings (e.g. stack trace message `Error: fetch failed for Bearer sk-abc...`). Combine with Sentry's server-side PII rules.
- Substring match is intentionally aggressive (`'auth' in 'authorId'` false positive) - that's fine, the scrub is free.
- Anonymous machine ID should hash BOTH hostname + homedir so a factory reset still produces a new ID (privacy), but a single user's repeat launches dedupe.
