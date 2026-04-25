---
version: 0.1.0-draft
name: privacy-client-secure-credential-handling
summary: Client for secure credential handling, secrets caching with TTL, encryption at rest
category: safety
confidence: medium
tags: [evolver, safety, credentials, secrets, reference]
source_type: extracted-from-git
source_url: https://github.com/EvoMap/evolver.git
source_ref: main
source_commit: 22773782475cecf43dc9c1af264bf5f9cacc28bc
source_project: evolver
source_paths:
  - src/gep/privacyClient.js
imported_at: 2026-04-18T00:00:00Z
---

# Privacy client — TTL-cached, encrypted credential handling

A small client that owns all secret material for the agent. Its contract:

- **Fetch** from a secure backing store (OS keychain, secret manager, KMS-wrapped env).
- **Cache** in memory with a short TTL (e.g., 60s). No plaintext on disk.
- **Evict** on TTL expiry *or* on any auth failure.
- **Encrypt** any at-rest cache (if one is needed for offline resilience) with a key derived from machine state (hardware ID + salt).
- **Redact** secrets from every log path by default; opt-in unredacted output behind an env flag for debugging.

## Why centralize

Scatter secrets through modules and you'll inevitably log one. A single client with redaction and TTL is much easier to audit.

## Reuse notes

Use the platform's native secret store where possible (Windows Credential Manager, macOS Keychain, Linux libsecret, KMS). The TTL cache is the layer that minimizes provider API calls without extending blast radius.
