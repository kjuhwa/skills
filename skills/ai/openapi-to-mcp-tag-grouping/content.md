# OpenAPI → MCP tool grouping by tag

## Problem
An OpenAPI spec often holds hundreds of operations. Exposing each as its own MCP tool explodes the tool list, burns context, and trips MCP clients that limit tool-name lengths (~40–64 chars). A flat one-tool-per-operation mapping also loses the semantic grouping humans already encoded in OpenAPI `tags`.

## Pattern
Collapse operations under their OpenAPI `tag` into a single MCP tool whose input schema is:

```
{
  "type": "object",
  "required": ["operation"],
  "properties": {
    "operation": { "type": "string", "enum": ["listUsers", "getUser", ...] },
    "args":      { "type": "object", "oneOf": [ <per-op arg schema>, ... ] }
  }
}
```

The tool name is the normalized tag (`lowercase`, non-`[a-z0-9_]` → `_`). Operations without tags fall back to a synthetic tag (`default`, or `<METHOD> <first-path-segment> Operations`). At execution time the server dispatches on `args.operation` and builds the HTTP request from the matching `Operation` in the spec.

## Example shape
```java
Map<String, List<OpRef>> tagGroups = new LinkedHashMap<>();
for (var path : paths.entrySet()) {
  for (var op : path.getValue().readOperationsMap().entrySet()) {
    List<String> tags = op.getValue().getTags();
    if (tags == null || tags.isEmpty()) tags = List.of("default");
    for (String t : filterTags(tags, cfg)) {
      tagGroups.computeIfAbsent(t, k -> new ArrayList<>())
               .add(new OpRef(opId, method, path, op));
    }
  }
}
// Then: one ToolDef per tagGroup entry.
```

Collect the union of parameter schemas across all ops in the group into a shared `paramProperties` map, then emit a `oneOf` variant per operation that lists which params are required for that operation.

## When to use
- You are wrapping an existing REST API as an MCP server and the spec already uses tags meaningfully.
- Tool count would otherwise exceed ~30 or blow past client-side name length caps.
- You want the LLM to reason at the resource/domain level ("widget", "topology") rather than per-endpoint.

## When NOT to use
- The spec has no tags and the paths are not clustered — a flat tool list is clearer.
- Consumers expect one MCP tool = one HTTP call (e.g., strict schema-to-schema binding with `structuredContent`).

## Pitfalls
- **Name collisions across multi-spec setups**: same tag appears in two specs. Detect and prefix with spec key (`widget.listWidgets`), then shorten to the client cap.
- **Unreferenced tags**: tags referenced by operations but missing from the top-level `tags:` section break some UIs. Auto-add missing tags to the top-level list after parsing.
- **`$ref` parameters**: resolve `$ref` against `components.schemas` before dropping into `paramProperties`, or the MCP client will see an unresolved pointer.
- **Tag filtering**: normalize tags (trim, lowercase) before applying `--include-tags` / `--exclude-tags`, because OpenAPI authors are inconsistent about case and spacing.
- Emit one `operation` enum per group rather than validating in code — it lets the MCP client autocomplete valid values.
