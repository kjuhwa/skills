---
name: mcp-multi-transport-config-pydantic
description: Single Pydantic config that supports three MCP transports (stdio, sse, streamable-http) with per-transport required-field validation in a model_validator(after) so users get a clear error when the wrong combination is set.
category: integration
version: 1.0.0
version_origin: extracted
tags: [mcp, pydantic, multi-transport, validation]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/Tracer-Cloud/opensre.git
source_ref: main
source_commit: fb5ba0a1b4ef511d16c56a80f1f126b1f581d724
source_project: opensre
source_path: app/integrations/openclaw.py
imported_at: 2026-04-18T00:00:00Z
---

# Single MCP Config with Per-Transport Required-Field Validation

## When to use
Your tool/agent integrates with an MCP server that exposes multiple transports (stdio for local dev, sse / streamable-http for hosted). Users give you ONE config dict; you want a single Pydantic model that accepts all transports but enforces the right required fields per `mode`.

## How it works
- A `mode: Literal["stdio","sse","streamable-http"]` field with a `before`-validator normalizing case.
- Per-field `before`-validators normalize URLs (`rstrip('/')`), strip whitespace from tokens, and convert `Bearer xxx` to bare tokens.
- A `model_validator(mode="after")` enforces transport-specific requirements: stdio requires `command`; sse/streamable-http require `url`.
- All built on a `StrictConfigModel` base so unknown keys are rejected with did-you-mean suggestions.

## Example
```python
class OpenClawConfig(StrictConfigModel):
    url: str = ""
    mode: Literal["stdio", "sse", "streamable-http"] = DEFAULT_MODE
    auth_token: str = ""
    command: str = ""
    args: tuple[str, ...] = ()
    headers: dict[str, str] = Field(default_factory=dict)
    timeout_seconds: float = Field(default=15.0, gt=0)
    integration_id: str = ""

    @field_validator("url", mode="before")
    @classmethod
    def _normalize_url(cls, value):
        return str(value or "").strip().rstrip("/")

    @field_validator("auth_token", mode="before")
    @classmethod
    def _normalize_auth_token(cls, value):
        token = str(value or "").strip()
        if token.lower().startswith("bearer "):
            token = token.split(None, 1)[1].strip()
        return token

    @model_validator(mode="after")
    def _validate_transport_requirements(self):
        if self.mode == "stdio" and not self.command:
            raise ValueError("OpenClaw stdio mode requires 'command'")
        if self.mode in ("sse", "streamable-http") and not self.url:
            raise ValueError(f"OpenClaw {self.mode} mode requires 'url'")
        return self
```

## Gotchas
- Use `Literal[...]` for the mode field so Pydantic emits a clear validation error for unknown transports — and so type checkers narrow downstream code.
- Strip `Bearer ` from auth tokens automatically; users frequently paste the full Authorization header value.
- Validate `gt=0` on timeouts directly in `Field(...)` rather than in a custom validator — built-in constraints surface clearer errors.
- Run normalization in `mode="before"` so the validators see the raw input (e.g. `"  https://x/  "`) before any other field-level processing.
