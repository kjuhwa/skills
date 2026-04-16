---
name: oauth-implementation-pitfall
description: Common OAuth 2.0 implementation mistakes found across flow visualization, token handling, and scope management that lead to security vulnerabilities.
category: pitfall
tags:
  - oauth
  - auto-loop
---

# oauth-implementation-pitfall

**Token validation theater.** The most dangerous pattern across all three apps is performing structural JWT decoding without cryptographic signature verification. Splitting on `.` and `atob()`-decoding the payload gives a false sense of inspection—any attacker can craft a valid-looking JWT with `alg: "none"` or a forged payload. Production code must validate the signature against the issuer's JWKS endpoint, reject `alg: none`, verify `iss` matches expected issuers, check `aud` matches the client's registered audience, and validate `nonce` against the session-stored value to prevent replay attacks. The token inspector pattern shows expiration checking (comparing `exp` to `Date.now()/1000`) which is necessary but insufficient—an expired token with a valid signature is safer than an unexpired token with no signature check. Additionally, `kid` (Key ID) in the header must be looked up against the issuer's key set, not trusted blindly.

**Flow-level security gaps.** The flow visualizer demonstrates PKCE (`code_challenge`/`code_verifier`) in Authorization Code flow but omits the `state` parameter for CSRF protection—without it, an attacker can inject their own authorization code into a victim's session. The Implicit flow is shown without any deprecation warning despite OAuth 2.1 removing it entirely due to token leakage via browser history, referrer headers, and URL fragments. Redirect URI validation is invisible in the visualization but is the single most critical check the authorization server performs; open-redirect vulnerabilities here lead to token theft. Client Credentials flow omits mutual TLS or client assertion alternatives to `client_secret`, which is problematic when secrets rotate or leak.

**Scope management blind spots.** The scope playground correctly implements AND-logic for compound permissions but misses several production pitfalls: no warning when the `admin` super-scope is toggled (which silently grants god-mode access), no incremental consent modeling (requesting `read:email` now and `write:repos` later without re-prompting for already-granted scopes), no scope-downgrade path (revoking a single scope without invalidating the entire token), and no distinction between scopes granted to access tokens vs. refresh tokens. The most insidious real-world bug is scope string parsing—OAuth defines scopes as space-separated, but implementations sometimes use comma-separated or JSON arrays, causing silent permission mismatches. The playground also doesn't model time-limited scopes or conditional scopes that expire independently of the token itself, which are increasingly common in enterprise OAuth deployments with fine-grained authorization policies.
