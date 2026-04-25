---
version: 0.1.0-draft
name: pydantic-strict-config-pattern-rationale
summary: OpenSRE inherits every config model from a StrictConfigModel base that forbids extra fields and surfaces "did you mean ..." suggestions for typos — preventing silent ignored fields and YAML key drift across many integrations.
category: reference
tags: [pydantic, config, validation, dx]
source_type: extracted-from-git
source_url: https://github.com/Tracer-Cloud/opensre.git
source_ref: main
source_commit: fb5ba0a1b4ef511d16c56a80f1f126b1f581d724
source_project: opensre
source_path: app/strict_config.py
imported_at: 2026-04-18T00:00:00Z
confidence: high
---

# StrictConfigModel — Rationale

## Why
Pydantic's default behaviour silently ignores unknown fields. For a CLI app with 20+ integrations and YAML configs, this means a user typo (`endpiont` for `endpoint`) is undetected until "Grafana isn't being queried even though I configured it". By the time you see the bug, you've spent an hour grepping.

Forbidding extra fields catches the typo at parse time. Adding a `difflib.get_close_matches` suggestion turns a frustrating "Unknown field 'endpiont'" into "Unknown field 'endpiont' (did you mean 'endpoint'?)".

## Inheritance footprint
Every integration config inherits StrictConfigModel:
- `MaskingPolicy`, `OpenClawConfig`, `GrafanaIntegrationConfig`, `DatadogIntegrationConfig`, `HoneycombIntegrationConfig`, `CoralogixIntegrationConfig`, `ToolMetadata`, `OpsGenieIntegrationConfig`, `JiraIntegrationConfig`, ...

## Side benefits
- Implicit whitespace stripping on every string field (`@field_validator("*", mode="before")` in the base class) — no more "API key has trailing newline" bugs.
- Consistent error-message format across the project.
- Field aliases honored in the allowed-set computation (so YAML keys can differ from Python attribute names).

## Cost
- New subclasses with intentional extras must override the validator (rare but exists).
- The `model_validator(mode="before")` runs on every parse; for hot-path models you could cache.

## Pattern in other projects
This pattern appears in many strict-config codebases (Pulumi, Hatch, Pydantic-Settings v2). Consider it the default for any config object that comes from a user-edited file.
