---
version: 0.1.0-draft
tags: [pitfall, refresh, token, not, regenerate]
name: refresh-token-do-not-regenerate
category: pitfall
summary: A refresh call must issue a new ACCESS token only, never a new refresh token.
source:
  kind: project
  ref: lucida-account@f1efa2ba
---

# Don't Re-Issue Refresh Tokens on Refresh

**Fact.** The `/refresh` endpoint accepts a valid refresh token and returns a new access token. It must NOT rotate or re-issue the refresh token itself (#107922).

**Why.** If each refresh call also mints a new refresh token, an attacker with a stolen refresh cookie can hold a session indefinitely — the "expiring" refresh window never closes. Keeping the refresh token fixed means the 24h clock is absolute from first issue.

**How to apply.** When reviewing auth code, reject any PR that updates the refresh token cookie during a `/refresh` call. Refresh rotation only happens on full login. If rotation is needed for security reasons, pair it with a server-side revocation list — not a naive "issue new + trust old" pattern.
