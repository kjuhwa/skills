---
name: admin-role-disabled-secretkey
version: 0.1.0-draft
tags: [decision, admin, role, disabled, secretkey]
category: decision
summary: Default `admins` role is disabled and the shared `SecretKey` was removed from `config.properties` — never re-enable without a per-install key
source:
  kind: project
  ref: cygnus@cbb96a6dfff
confidence: medium
---

# Admin Role Disabled, SecretKey Removed

## Fact
The built-in `admins` role ships disabled, and the shared `SecretKey` value was removed from `config.properties`. Together they close a "default admin credential" vulnerability that shipped in older builds.

## Why
A shared key in a public config file meant every deployment trusted the same secret. Combined with an always-present admin role, it was an authorization-bypass waiting to be weaponized.

## How to apply
- Do not restore a default `SecretKey` to `config.properties` under any circumstance.
- If a deployment genuinely needs the admin role, generate a per-install key out-of-band and inject it via environment, not committed config.
- Any PR that re-enables the `admins` role or adds a default secret is a red-flag review.
