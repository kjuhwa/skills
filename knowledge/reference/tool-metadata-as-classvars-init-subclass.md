---
version: 0.1.0-draft
name: tool-metadata-as-classvars-init-subclass
summary: BaseTool uses __init_subclass__ to validate ClassVars (name, description, input_schema, source, use_cases, requires, outputs) through a Pydantic ToolMetadata model at class-creation time — so misconfigured tools fail at import, not at runtime.
category: reference
tags: [init-subclass, classvars, pydantic, fail-fast]
source_type: extracted-from-git
source_url: https://github.com/Tracer-Cloud/opensre.git
source_ref: main
source_commit: fb5ba0a1b4ef511d16c56a80f1f126b1f581d724
source_project: opensre
source_path: app/tools/base.py
imported_at: 2026-04-18T00:00:00Z
confidence: medium
---

# Tool Metadata as ClassVars, Validated in `__init_subclass__`

## The pattern
Each tool subclass declares its metadata as class-level attributes:

```python
class DataDogLogsTool(BaseTool):
    name: ClassVar[str] = "query_datadog_logs"
    description: ClassVar[str] = "Query Datadog logs for the last N minutes."
    input_schema: ClassVar[dict[str, Any]] = {...}
    source: ClassVar[EvidenceSource] = "datadog"
    use_cases: ClassVar[list[str]] = ["log queries", "error investigation"]
    requires: ClassVar[list[str]] = ["datadog_api_key", "datadog_app_key"]
    outputs: ClassVar[dict[str, str]] = {...}

    def run(self, service_name, time_range_minutes, ...):
        ...
```

`BaseTool.__init_subclass__` runs at class creation time and validates via `ToolMetadata.model_validate(...)` — so if a tool forgets `name` or `description`, the import itself fails.

## Why ClassVars
- No instance required to inspect metadata (planner can read `DataDogLogsTool.name` without instantiating).
- Type-checker friendly — mypy confirms subclasses have the right attributes.
- Pydantic validation at import time rather than first invocation.

## Why re-assign in `__init_subclass__`
After validation, the metadata is copied BACK onto the class from the validated `ToolMetadata` instance. This strips whitespace (via StrictConfigModel's `@field_validator("*", mode="before")`) and normalizes defaults — subsequent reads of `cls.name` see the cleaned version.

## Trade-offs
- Pro: A typo in a tool's source (`"datatog"`) fails at import, not at runtime.
- Pro: No runtime metaclass magic; just `__init_subclass__`.
- Con: Adds a small per-class import-time cost. Negligible unless you have thousands of tools.
- Con: The metadata structure (declared via ClassVars) and the ToolMetadata Pydantic model must stay in sync. This is fine in a small team but requires discipline as the project grows.

## Lessons
For any plugin architecture where plugins are classes, `__init_subclass__` + Pydantic metadata is a cleaner alternative to:
- Manual "register this plugin" calls in every subclass.
- Metaclasses.
- Decorator-based registration (which is order-sensitive).

The same pattern works for: Pytest fixture libraries, Django admin registration, type-ahead dispatchers.
