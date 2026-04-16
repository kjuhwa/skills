---
name: oauth-implementation-pitfall
description: Common OAuth front-end demo and integration pitfalls around token handling, scope logic, and flow selection.
category: pitfall
tags:
  - oauth
  - auto-loop
---

# oauth-implementation-pitfall

**Token decoding without validation is the most common false-confidence trap.** These demos use `atob` + `JSON.parse` to decode JWTs client-side, which correctly reveals claims but performs zero signature verification. In production, developers copy this pattern and trust the decoded `exp` or `scope` claims without validating the signature against the issuer's JWKS endpoint. The `now` timestamp used for expiry checks is captured once at page load (`Math.floor(Date.now()/1000)`) rather than re-evaluated at check time, so a tab left open for an hour still shows the token as "valid" long after it expired. Any client-side expiry check is advisory — the resource server is the only authoritative validator.

**Scope-to-endpoint mapping with `every()` silently fails open when the requires array is empty.** If an endpoint accidentally has `requires: []`, the `every()` check returns `true` for all scope combinations, granting universal access to that route. In production authorization middleware, this manifests as unprotected admin endpoints when a developer adds a new route and forgets to annotate its required scopes. The inverse pitfall — using `some()` instead of `every()` — means an endpoint that should require both `repos:write` AND `admin` unlocks with either scope alone, violating the principle of least privilege for destructive operations like `DELETE /repos/:id`.

**Choosing the wrong grant type is the most consequential architectural mistake.** The PKCE flow and the plain Authorization Code flow look nearly identical in the visualizer (same 8 steps, same actor set), but omitting PKCE for a public client (SPA, mobile app) leaves the authorization code interceptable. Client Credentials flow skips the user entirely, which is correct for machine-to-machine but catastrophic if used for user-facing features — it grants a single service identity access to all users' data. Demos that show all three flows side-by-side without emphasizing these selection criteria teach the mechanics without the judgment, leading to developers picking the simplest flow rather than the correct one.
