---
version: 0.1.0-draft
name: posthog-cli-telemetry-conventions
summary: OpenSRE's CLI telemetry uses PostHog with a public anon key embedded in the binary, anonymous_id stored in ~/.config, no-PII guarantee, opt-out via DO_NOT_TRACK or app-specific env, and StrEnum-based event naming.
category: reference
tags: [posthog, telemetry, cli, conventions, opt-out]
source_type: extracted-from-git
source_url: https://github.com/Tracer-Cloud/opensre.git
source_ref: main
source_commit: fb5ba0a1b4ef511d16c56a80f1f126b1f581d724
source_project: opensre
source_path: app/analytics/provider.py
imported_at: 2026-04-18T00:00:00Z
confidence: medium
---

# PostHog CLI Telemetry — Conventions

## What goes in
Hardcoded constants in source:
```python
_POSTHOG_API_KEY = "phc_zutpVhmQw7..."  # PostHog public key (safe to embed)
_POSTHOG_HOST = "https://us.i.posthog.com"
_QUEUE_SIZE = 128
_SEND_TIMEOUT = 2.0
_SHUTDOWN_WAIT = 1.0
```

## Anonymous ID lifecycle
- First run: generate UUID4, save to `~/.config/<app>/anonymous_id`.
- Subsequent runs: read existing.
- Failure to read/write: fall back to per-process UUID (still anonymous, just not persistent).

## Opt-out
Both honored:
- `DO_NOT_TRACK=1` (industry standard from consoledonottrack.com)
- `<APP>_ANALYTICS_DISABLED=1` (project-specific)

## Event naming via StrEnum
```python
class Event(StrEnum):
    CLI_INVOKED            = "cli_invoked"
    INSTALL_DETECTED       = "install_detected"
    ONBOARD_STARTED        = "onboard_started"
    ONBOARD_COMPLETED      = "onboard_completed"
    INVESTIGATION_STARTED  = "investigation_started"
    INVESTIGATION_COMPLETED= "investigation_completed"
    INTEGRATION_VERIFIED   = "integration_verified"
    DEPLOY_STARTED         = "deploy_started"
    # ...
```

Single source of truth for event names; impossible to typo because the enum is required at the call site.

## Property hygiene
Base properties auto-attached: `cli_version`, `python_version`, `os_family`, `os_version`, `$process_person_profile: false` (PostHog tells the server not to create a person profile).

## What is explicitly NOT collected
Per OpenSRE's README:
- Alert contents
- File contents
- Hostnames
- Credentials
- Any PII

Per-event properties only contain command names, success/failure, rough runtime, command-specific safe metadata (e.g. which provider was selected, whether `--interactive` was passed).

## Disabled environments
Telemetry is automatically disabled in GitHub Actions and pytest runs to keep adoption metrics meaningful — i.e. real human users only.

## The pattern
PostHog public key + opt-out flags + StrEnum event names + bounded queue + atexit flush is the canonical "open-source CLI telemetry" recipe. Easily lifted to any other CLI.
