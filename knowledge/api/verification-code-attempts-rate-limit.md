---
version: 0.1.0-draft
name: verification-code-attempts-rate-limit
summary: Track verification-code attempts per-code and lock out after N tries; protect against brute-force of 6-digit codes.
category: api
tags: [auth, rate-limit, verification-code, brute-force, security]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/multica-ai/multica.git
source_ref: main
source_commit: 6cd49e132de7632b1f2aaa675c98e8eca9308bb7
source_project: multica
source_path: server/migrations/010_verification_code_attempts.up.sql
imported_at: 2026-04-18T00:00:00Z
---

Email-based login uses a 6-digit verification code. That's only a million possible values — easy brute-force without rate-limiting.

Defense: track attempts per code, lock after ~5 failures, expire codes quickly (typical 10-15 minutes).

```sql
CREATE TABLE verification_code_attempts (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,        -- hash the code; never store plaintext
  attempts INTEGER NOT NULL DEFAULT 0,
  locked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_verification_attempts_email_active ON verification_code_attempts (email, expires_at) WHERE NOT locked;
```

On verify:
1. Look up the most recent non-expired row for the email.
2. If `attempts >= 5` or `locked`, reject immediately.
3. Compare hashed input to `code_hash`.
4. On mismatch: `attempts += 1`, `locked = attempts >= 5`. Reject.
5. On match: mark consumed, issue session.

## Why

Without per-code attempt tracking, an attacker can iterate through all 1M codes quickly. Global rate-limiting on the verify endpoint helps but isn't enough — a patient attacker can stretch it over time. Per-code lockout bounds the attempt budget tightly.

Hashing the code at rest matters too: a DB leak of plaintext codes gives anyone who knows a recent email address a valid session.

## Evidence

- `server/migrations/009_verification_code.up.sql` + `010_verification_code_attempts.up.sql`.
- `server/internal/service/email.go` — send/verify flow (referenced).
