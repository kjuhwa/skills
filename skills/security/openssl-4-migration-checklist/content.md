# OpenSSL 4.0.0 migration checklist

Upstream OpenSSL 4.0.0 introduces breaking API changes, removed legacy protocols, and changed cleanup semantics. Follow this checklist when upgrading a 3.x-pinned project.

## When to use

- Bumping the OpenSSL dependency from 3.x to 4.0.0 in a C/C++ project.
- Reviewing a build that started failing after an OpenSSL headers bump.
- Auditing whether a library that wraps OpenSSL is ready for 4.0.

## Steps

1. **Audit const-qualifier adds.** Many X509 and related APIs gained `const` on arguments/returns. Compile against the new headers; treat every new const-mismatch warning as a real call site to patch (don't cast it away).
2. **Replace removed error-state APIs.** `ERR_get_state`, `ERR_remove_state`, `ERR_remove_thread_state` are gone. Move callers to the current thread-error API.
3. **Drop fixed SSL/TLS version method functions.** `SSLv3_method`, `TLSv1_method`, etc. are removed. Use `TLS_method()` and constrain versions via `SSL_CTX_set_min/max_proto_version`.
4. **Remove custom EVP method registrations.** Custom `EVP_CIPHER`/`EVP_MD`/`EVP_PKEY`/`EVP_PKEY_ASN1` method-creation APIs no longer exist. Port to the provider API.
5. **Stop direct `ASN1_STRING` field access.** The struct is opaque. Replace `->data`, `->length`, `->type` reads with `ASN1_STRING_get0_data`, `ASN1_STRING_length`, `ASN1_STRING_type`.
6. **Delete engine glue.** ENGINE support is removed. `OPENSSL_NO_ENGINE` is always defined. Remove `ENGINE_load_*`, `ENGINE_by_id`, etc.
7. **Audit TLS deprecated-EC usage.** Deprecated curves and explicit EC curves are off by default. If you still need them, rebuild with `enable-tls-deprecated-ec` and `enable-ec_explicit_curves` — otherwise delete the code.
8. **Replace deprecated X509 time APIs.** `X509_cmp_time`, `X509_cmp_current_time`, `X509_cmp_timeframe` → `X509_check_certificate_times`.
9. **Review cleanup assumptions.** libcrypto no longer registers an `atexit` cleanup. If you relied on automatic teardown (leak detectors, long-running daemons restarting), call `OPENSSL_cleanup()` explicitly.
10. **Regenerate hex-parsing tests.** Hex dump widths standardized (24 bytes for signatures, 16 elsewhere) and leading `00:` bytes are stripped when the first significant byte ≥ 0x80. Golden files with OpenSSL hex output will drift.
11. **Swap `c_rehash` callers.** The script is gone; use `openssl rehash`.
12. **Remove SSLv3 / SSLv2 ClientHello paths.** Dead code now — the library refuses to negotiate these.
13. **Check darwin build targets.** `darwin-i386*`, `darwin-ppc*` targets are removed; fail fast in CI on those runners.

## Success criteria

- Project compiles against 4.0.0 headers with `-Werror` and the original warning flags.
- `openssl list -all-providers` shows the providers your code actually uses.
- TLS smoke tests cover min/max proto version and any EC curves still enabled.
- Integration tests with an external peer still pass (handshake, cert-validation boundaries).

## Gotchas

- Some code uses `const_cast`-style tricks to squash the new warnings. That hides call sites that genuinely mutate the input — track them down instead.
- If a wrapper library (Python cryptography, Ruby openssl, Go x/crypto) hasn't released a 4.0.0-compatible build yet, you'll wedge consumers. Check compatibility matrices before upgrading shared infra.
- FIPS provider gained stricter lower bounds on `PKCS5_PBKDF2_HMAC` — old short-password fixtures in tests may start failing.

## Reference — removed / deprecated inventory

- `ERR_get_state`, `ERR_remove_state`, `ERR_remove_thread_state` — removed.
- Fixed-version method functions (`SSLv3_method`, `TLSv1_method`, etc.) — removed.
- Custom `EVP_CIPHER`/`EVP_MD`/`EVP_PKEY`/`EVP_PKEY_ASN1` methods — no longer supported.
- `BIO_f_reliable()` — removed with no replacement.
- ENGINE framework — removed; `OPENSSL_NO_ENGINE` always defined.
- `c_rehash` script — replaced by `openssl rehash`.
- SSLv3 / SSLv2 ClientHello — removed.
- Deprecated TLS elliptic curves and explicit EC curves — disabled by default (rebuild with `enable-tls-deprecated-ec` / `enable-ec_explicit_curves`).
- `X509_cmp_time`, `X509_cmp_current_time`, `X509_cmp_timeframe` — deprecated in favor of `X509_check_certificate_times`.
- darwin-i386, darwin-i386-cc, darwin-ppc, darwin-ppc64, darwin-ppc64-cc — removed build targets.

## Source

- https://github.com/openssl/openssl/releases/tag/openssl-4.0.0 — OpenSSL 4.0.0 release notes (vendor-canonical).
- Research lane: skills_research trend survey, 2026-04-16 window.
