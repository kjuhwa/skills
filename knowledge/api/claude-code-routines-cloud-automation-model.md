---
version: 0.1.0-draft
tags: [api, claude, code, routines, cloud, automation]
name: claude-code-routines-cloud-automation-model
category: api
summary: Claude Code Routines (research preview) are saved cloud sessions — prompt + repos + connectors + environment — triggered by schedule, HTTP POST, or GitHub events. One routine can combine all three. Daily run cap per account; branch pushes restricted to `claude/*` by default.
source:
  kind: web-research
  ref: skills_research:trend:2026-04-16
---

# Claude Code Routines: trigger model

**Fact.** A *routine* is a saved Claude Code configuration (prompt, repositories, environment, connectors) that runs autonomously on Anthropic-managed cloud infrastructure. Manage them at `claude.ai/code/routines` or with `/schedule` in the CLI. Three trigger types, combinable on a single routine:
- **Scheduled** — hourly / daily / weekdays / weekly presets; arbitrary cron via `/schedule update`. Minimum interval 1 hour.
- **API** — per-routine HTTPS endpoint `POST https://api.anthropic.com/v1/claude_code/routines/{routine_id}/fire`. Per-routine bearer token, shown once. Optional `text` field in the body is passed as freeform context (not parsed). Required headers: `Authorization: Bearer <token>`, `anthropic-beta: experimental-cc-routine-2026-04-01`, `anthropic-version: 2023-06-01`, `Content-Type: application/json`. Response: `{claude_code_session_id, claude_code_session_url}`.
- **GitHub** — webhook-triggered on `pull_request` or `release` events. Requires the Claude GitHub App installed separately from `/web-setup`. Filters: author, title, body, base/head branch, labels, draft/merged/fork; regex matches the whole field.

Runtime properties: routines run autonomously (no permission prompts); repos are cloned on every run from the default branch; branch pushes restricted to `claude/*` unless "Allow unrestricted branch pushes" is on per repo; routines are per-user (not team-shared); daily run cap per account with overage under "extra usage" billing. Plan requirement: Pro, Max, Team, or Enterprise with Claude Code on the web enabled.

**Why.** Routines solve "want Claude to do this unattended" — scheduled maintenance, CI-adjacent code generation, alert triage, deploy verification. Cloud execution means runs survive laptop sleep/close; GitHub-event triggers keep them in the repo's flow.

**How to apply.** Scope each routine tightly — one prompt with explicit success criteria, since there's no human to course-correct mid-run. Use filters on GitHub triggers to avoid burning the daily cap on PR noise. Rotate API tokens when developers leave, or store them per-environment in your alerting tool's secret store. Routine actions (commits, PRs, Slack messages via connectors) appear under *your* identity — remember this when wiring shared workflows. Don't expect GitHub-trigger event reuse: two PR updates produce two independent sessions.

**Counter / caveats.** Research preview: API surface, rate limits, and token semantics may change; breaking changes ship under new dated beta headers with the two most recent versions still accepted. GitHub webhook events are subject to per-routine and per-account hourly caps during preview. `/web-setup` grants clone access but does *not* install the Claude GitHub App needed for webhook delivery — a common setup gotcha.

## Sources

- https://code.claude.com/docs/en/routines — canonical Claude Code docs (2026-04). High confidence as vendor-canonical reference; behavior may drift while the feature is in preview.
