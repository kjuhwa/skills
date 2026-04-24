---
name: response-pagination-with-metadata
description: Expose pageSize/pageIdx in MCP tool schemas and return pagination metadata (currentPage, totalPages, hasNextPage, startIndex, endIndex) in both the text and structured response so agents can iterate large result sets deterministically.
category: mcp
version: 1.0.0
version_origin: extracted
tags: [mcp, pagination, token-budget, response-design, agent-ux]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/ChromeDevTools/chrome-devtools-mcp.git
source_ref: main
source_commit: 0a6aaa52ebacb2db834ffa437863e5844aa3730b
source_project: chrome-devtools-mcp
source_path: src/utils/pagination.ts
imported_at: 2026-04-18T00:00:00Z
---

# Tool Response Pagination

## When to use

- An MCP tool can return a list whose size you cannot bound (network requests, console messages, heap aggregates, search hits).
- Without pagination a single call could blow the agent's context window or truncate mid-entry.
- You want agents to be able to say "give me the next page" naturally.

## How it works

- Add `pageSize?: number` and `pageIdx?: number` to every list-returning tool's schema with `zod.number().int().positive()` / `.min(0)`. Default page size is a sensible 20; omitting both returns everything (back-compat).
- Implement a generic `paginate<T>(items, opts)` that returns `{items, currentPage, totalPages, hasNextPage, hasPreviousPage, startIndex, endIndex, invalidPage}`. If `pageIdx` is out of range, coerce to page 0 but set `invalidPage: true`.
- In the response builder, add a short human-readable line — `"Showing 1-20 of 173 (Page 1 of 9). Next page: 1"` — and put the full pagination object in `structuredContent.pagination` for programmatic consumers.
- On invalid page input, prepend `"Invalid page number provided. Showing first page."` before the summary so the agent learns to use `totalPages` as the bound.

## Example

```ts
export function paginate<T>(items, options) {
  const total = items.length;
  if (!options || (options.pageSize === undefined && options.pageIdx === undefined)) {
    return {items, currentPage: 0, totalPages: 1, hasNextPage: false, hasPreviousPage: false, startIndex: 0, endIndex: total, invalidPage: false};
  }
  const pageSize = options.pageSize ?? 20;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const {currentPage, invalidPage} = resolvePageIndex(options.pageIdx, totalPages);
  const startIndex = currentPage * pageSize;
  const pageItems = items.slice(startIndex, startIndex + pageSize);
  return {items: pageItems, currentPage, totalPages, hasNextPage: currentPage < totalPages - 1, hasPreviousPage: currentPage > 0, startIndex, endIndex: startIndex + pageItems.length, invalidPage};
}

// in response format:
response.push(`Showing ${startIndex+1}-${endIndex} of ${data.length} (Page ${currentPage+1} of ${totalPages}).`);
if (result.hasNextPage) response.push(`Next page: ${currentPage + 1}`);
if (result.hasPreviousPage) response.push(`Previous page: ${currentPage - 1}`);
structuredContent.pagination = result;
```

## Gotchas

- Emit `totalPages` even when `pageSize` is unset — the agent needs the *bound* before it can ask for page N.
- The "Next page: N" hint is absolute page index, not relative. Make sure the hint is unambiguous; early drafts wrote "Next page: current+1" and agents paged off the end.
- Return an empty `items` array, not `null`, when the list is legitimately empty. Agents branch poorly on null in JSON.
- If filters are applied (e.g. `resourceTypes`), paginate *after* filtering so the page index matches what the agent sees. This is load-bearing for agent mental models.
- Keep `pageSize` optional. A tool that *requires* it drives up input verbosity on every call.
