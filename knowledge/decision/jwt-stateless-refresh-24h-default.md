---
version: 0.1.0-draft
tags: [decision, jwt, stateless, refresh, 24h, default]
name: jwt-stateless-refresh-24h-default
category: decision
summary: JWT stateless auth with 1h access / 24h refresh token defaults, both env-tunable.
source:
  kind: project
  ref: lucida-account@f1efa2ba
---

# JWT Expiry Defaults: 1h Access, 24h Refresh

**Fact.** Access token defaults to `3600000ms` (1h), refresh token to `86400000ms` (24h). Overridable per environment via `JWT_TOKEN_EXPIRATION_ACCESS` / `JWT_TOKEN_EXPIRATION_REFRESH`.

**Why.** Stateless validation (no server-side session store in the hot path) traded against a short access-token blast radius. Refresh at 24h matches typical workday login cadence; anything longer increases stolen-cookie exposure without meaningful UX gain.

**How to apply.** When touching auth flows, assume these numbers unless ops has overridden them. Refresh tokens may be cookie-delivered; never issue a new refresh token on a refresh call — only a new access token (prevents infinite session extension on a stolen cookie).
