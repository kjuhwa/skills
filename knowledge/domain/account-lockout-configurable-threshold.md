---
version: 0.1.0-draft
tags: [domain, account, lockout, configurable, threshold]
name: account-lockout-configurable-threshold
category: domain
summary: Failed-login counter locks the account after a configurable threshold (ACCOUNT_LOCKOUT, default 10).
source:
  kind: project
  ref: lucida-account@f1efa2ba
---

# Account Lockout After N Failed Attempts

**Fact.** `lucida.security.login.max-fail-count` (env `ACCOUNT_LOCKOUT`) gates a per-account counter. On reaching the threshold, login is rejected until an admin unlocks or a timeout elapses. Counter resets on any successful login.

**Why.** Defense in depth against credential stuffing. Threshold is env-tunable because enterprise deployments often demand stricter policies (e.g., 3) than SaaS defaults.

**How to apply.** When adding a new auth path (SSO callback, challenge-response, API-key fallback), wire it into the same counter — otherwise attackers pivot to the un-instrumented path. On unlock flows, also clear any associated Redis challenge-attempt keys.
