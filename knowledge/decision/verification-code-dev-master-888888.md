---
version: 0.1.0-draft
name: verification-code-dev-master-888888
summary: Dev/self-host stacks may enable a fixed master verification code for evaluation, but this MUST be disabled on public deployments — anyone who knows an email can log in.
category: decision
tags: [auth, self-hosting, dev-mode, security, verification]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/multica-ai/multica.git
source_ref: main
source_commit: 6cd49e132de7632b1f2aaa675c98e8eca9308bb7
source_project: multica
source_path: SELF_HOSTING.md
imported_at: 2026-04-18T00:00:00Z
---

For zero-config evaluation of a self-hosted stack, accept a fixed verification code (`888888`) for any email when `APP_ENV=development`. Docker self-host stack defaults `APP_ENV=production` so the master code is disabled by default.

Three modes:
- **Production**: configure an email provider (e.g. Resend) with API key; real codes go to real emails.
- **Dev master**: set `APP_ENV=development`, accept `888888` for any email. Never expose publicly.
- **Log fallback**: if neither is configured, server-generated codes are printed to backend container logs (`[DEV] Verification code for ...: XXXXXX`). Useful for one-off single-machine testing.

## Why

The alternative (always require a real email provider) makes "try it in Docker for five minutes" impossible. The `888888` shortcut dramatically reduces onboarding friction for self-hosters running on a private network, dev laptop, or Codespaces — but it's also the single biggest self-hosting security pitfall.

Make the default safe (`production`) and make the unsafe mode explicit and loud (`APP_ENV=development`) rather than the reverse. Put the warning prominently in setup docs.

## Evidence

- `SELF_HOSTING.md:65-72` — explicit mode breakdown and warning.
- `docker-compose.selfhost.yml:59` — `APP_ENV: ${APP_ENV:-production}` default.
- `Makefile:69` — `make selfhost` welcome message mentions the code (dev-friendly default there).
