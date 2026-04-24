---
name: async-jwt-jwks-cache-with-lock
description: Async JWKS cache that uses one asyncio.Lock per JWKS URL to prevent thundering-herd refetch, with double-checked locking and TTL-based expiry; signature + issuer verified, kid-matched key extraction.
category: security
version: 1.0.0
version_origin: extracted
tags: [jwt, jwks, async, httpx, clerk]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/Tracer-Cloud/opensre.git
source_ref: main
source_commit: fb5ba0a1b4ef511d16c56a80f1f126b1f581d724
source_project: opensre
source_path: app/auth/jwt_auth.py
imported_at: 2026-04-18T00:00:00Z
---

# Async JWT/JWKS Verifier with Lock-per-URL

## When to use
Your FastAPI/LangGraph server verifies JWT tokens issued by a third party (Clerk, Auth0, Cognito) with rotating signing keys. You need full async I/O to avoid blocking the event loop, JWKS caching with TTL to avoid hammering the issuer, and a lock per URL so 100 simultaneous requests don't all refetch the same JWKS.

## How it works
- `AsyncJWKSCache` keeps a `dict[url, CachedJWKS]` plus a `dict[url, asyncio.Lock]`.
- `get_jwks(url)` does a check-without-lock, then if stale acquires the lock, **re-checks** (double-checked locking), then performs the httpx GET.
- Verification flow: decode unverified header to read `iss` and `kid` → match issuer against allow-list → fetch JWKS (cached) → match `kid` against `keys[].kid` → call `jwt.decode` with `verify_signature/exp/iss=True`, `require=["sub","exp","iss"]`.
- Sync wrapper detects already-running event loops and uses a separate thread pool to avoid the "asyncio.run cannot be called from a running event loop" trap.

## Example
```python
@dataclass
class AsyncJWKSCache:
    _cache: dict[str, CachedJWKS] = field(default_factory=dict)
    _locks: dict[str, asyncio.Lock] = field(default_factory=dict)
    _cache_ttl: int = JWKS_CACHE_TTL_SECONDS

    def _get_lock(self, url):
        if url not in self._locks:
            self._locks[url] = asyncio.Lock()
        return self._locks[url]

    async def get_jwks(self, url):
        now = time.time()
        if url in self._cache and now - self._cache[url].fetched_at < self._cache_ttl:
            return self._cache[url].keys
        async with self._get_lock(url):
            if url in self._cache and now - self._cache[url].fetched_at < self._cache_ttl:
                return self._cache[url].keys           # double-check
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(url); resp.raise_for_status()
                jwks_data = resp.json()
            self._cache[url] = CachedJWKS(keys=jwks_data, fetched_at=now)
            return jwks_data

async def verify_jwt_async(token: str) -> JWTClaims:
    unverified = decode_jwt_payload_unverified(token)
    issuer = unverified.get("iss")
    if issuer not in get_valid_issuers():
        raise JWTInvalidIssuerError(...)
    jwks = await _async_jwks_cache.get_jwks(get_jwks_url_for_issuer(issuer))
    signing_key = get_signing_key_from_jwks(jwks, token)
    payload = jwt.decode(token, signing_key, algorithms=[JWT_ALGORITHM],
                         issuer=issuer,
                         options={"verify_signature": True, "verify_exp": True,
                                  "verify_iss": True, "require": ["sub","exp","iss"]})
    return JWTClaims.from_payload(payload)
```

## Gotchas
- Double-check inside the lock — without it, the lock just serializes redundant fetches.
- Always include `require=["sub","exp","iss"]` in `jwt.decode` options; missing claims should fail closed.
- The sync wrapper has three branches (no loop, idle loop, running loop). Without the running-loop branch, calling from inside async code raises `RuntimeError`. Use a single-thread pool to bridge.
- Allow-list multiple issuers in dev (DEV + PROD) but only PROD in production — environment-specific behavior is critical for security.
