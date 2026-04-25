---
version: 0.1.0-draft
name: env-configurable-short-circuit-kill-switches
summary: Ship optimizations (healthy short-circuit, masking, guardrails, keyring) with env-var kill switches so ops can disable a bad heuristic without a deploy. Defaults favor safety (ENABLED for protection, DISABLED for speculative optimizations).
category: ops
tags: [kill-switch, env-config, ops, safety]
source_type: extracted-from-git
source_url: https://github.com/Tracer-Cloud/opensre.git
source_ref: main
source_commit: fb5ba0a1b4ef511d16c56a80f1f126b1f581d724
source_project: opensre
source_path: app/nodes/root_cause_diagnosis/evidence_checker.py
imported_at: 2026-04-18T00:00:00Z
confidence: medium
---

# Env-Configurable Kill Switches

## The pattern
Every non-critical optimization or behavior-changing feature is gated behind an env var with a sensible default:

| Feature | Env var | Default | Action |
|---|---|---|---|
| Healthy short-circuit (skip LLM for healthy alerts) | `HEALTHY_SHORT_CIRCUIT` | `"true"` | Disable if heuristic misfires in prod |
| Masking of identifiers | `OPENSRE_MASK_ENABLED` | `"false"` | Enable when privacy is needed |
| Guardrails | Rule file presence | Inactive if file missing | Add rules to enable |
| Keychain storage | `OPENSRE_DISABLE_KEYRING` | `"false"` | Disable in Docker/CI where keyring isn't available |
| Debug logging | `TRACER_VERBOSE` | `""` | Enable to debug |
| Output format | `TRACER_OUTPUT_FORMAT` | auto-detect | Force rich/text |
| Telemetry | `DO_NOT_TRACK` / `OPENSRE_ANALYTICS_DISABLED` | `"0"` | Opt out |

## Convention
- Truthy = `{"1", "true", "yes", "on"}` (case-insensitive). A `frozenset` comparison keeps this consistent across modules.
- Falsy = everything else (including unset and empty string).
- Default behavior is chosen so the safe path wins: optimizations that might misfire default to enabled-but-easily-disabled (`HEALTHY_SHORT_CIRCUIT=true`); safety features default to explicit-opt-in (masking).

## Why this matters
- A production SRE who discovers that the healthy short-circuit mis-classified a real incident as healthy can disable it in 30 seconds without a deploy.
- Ops playbooks can include `OPENSRE_DISABLE_KEYRING=1` for Docker without touching the app.
- Supporting both app-specific (`OPENSRE_*`) and industry-standard (`DO_NOT_TRACK`) env vars for the same flag expands reach.

## Anti-pattern to avoid
Burying the kill-switch logic inside a multi-layered config loader. Keep it as a simple `if os.getenv(X, "").lower() in _TRUTHY: ...` at the use site. The cost of 5 lines of repeated parsing is nothing vs. the debuggability win.
