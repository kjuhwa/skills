---
name: sanitize-tool-params-for-metrics
description: When logging tool-invocation metrics, record only privacy-safe derivatives of arguments — string lengths, array counts, enum values — never raw values; drive the transformation from the tool's zod schema.
category: telemetry
version: 1.0.0
version_origin: extracted
tags: [telemetry, privacy, zod, schema, metrics]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/ChromeDevTools/chrome-devtools-mcp.git
source_ref: main
source_commit: 0a6aaa52ebacb2db834ffa437863e5844aa3730b
source_project: chrome-devtools-mcp
source_path: src/telemetry/flagUtils.ts
imported_at: 2026-04-18T00:00:00Z
---

# Sanitize Tool Parameters for Metrics

## When to use

- You want to log "how often and with what shape tools are called" without leaking user data (URLs, selectors, search queries, file paths).
- You already have typed schemas (zod, JSON schema, etc.) for every tool's params.

## How it works

- Walk the tool's schema once per invocation. For each param:
  - `ZodString` → emit `<snake_case_name>_length: value.length` (number).
  - `ZodArray` → emit `<snake_case_name>_count: value.length` (number).
  - `ZodNumber`/`ZodBoolean` → emit the raw value (these are safe in context).
  - `ZodEnum` → emit the enum string as-is (finite set, known values).
  - Anything else (`ZodObject`, etc.) → refuse to log (throw at tool-authoring time, not runtime).
- Unwrap `ZodOptional`, `ZodDefault`, `ZodNullable`, `ZodEffects` recursively to get at the inner type — schemas commonly layer modifiers.
- Keep a `PARAM_BLOCKLIST` (e.g. `uid`, `reqid`, `msgid` — any internal opaque handle) to strip entirely regardless of type.
- Type-check value against declared type before transform; log mismatches as errors so drift is detected.

## Example

```ts
export function sanitizeParams(params, schema) {
  const out = {};
  for (const [name, value] of Object.entries(params)) {
    if (PARAM_BLOCKLIST.has(name)) continue;
    const zodType = getZodType(schema[name]); // unwraps Optional/Default/Nullable/Effects
    if (!hasEquivalentType(zodType, value)) throw new Error(`type mismatch for ${name}`);
    const key = transformArgName(zodType, name); // foo → foo_length for strings
    out[key] = transformValue(zodType, value);   // "hello" → 5
  }
  return out;
}

function getZodType(t) {
  const def = t._def;
  if (['ZodOptional','ZodDefault','ZodNullable'].includes(def.typeName)) return getZodType(def.innerType);
  if (def.typeName === 'ZodEffects') return getZodType(def.schema);
  if (SUPPORTED.includes(def.typeName)) return def.typeName;
  throw new Error(`Unsupported zod type ${def.typeName}`);
}
```

## Gotchas

- Refuse (throw at startup / in a test) when a tool's schema uses unsupported types for logged params. Otherwise the first time someone adds a `ZodObject` input to a tool, telemetry silently ships the raw object.
- `ZodEnum` with sensitive values (URLs, IDs) isn't actually enum-like — audit enum definitions, they should be finite categorical choices.
- Always snake_case the param name for emitted metric keys. Metrics backends expect consistent casing; `foo_length` beats `fooLength` in querying.
- Maintain the blocklist per project; `uid`/`reqid`/`msgid` are common but yours will differ.
- Ship a flag like `USAGE_STATISTICS=false` as the environment kill switch, and check it *before* constructing the telemetry client at all — not inside `sanitizeParams`.
