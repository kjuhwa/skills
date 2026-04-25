---
version: 0.1.0-draft
name: lighthouse-audit-scope-excludes-performance
summary: The project's `lighthouse_audit` tool explicitly runs only the `accessibility`, `seo`, and `best-practices` categories; Lighthouse performance is delegated to `performance_start_trace` because the DevTools TraceEngine gives better Core Web Vitals insights for an agent workflow.
category: decision
confidence: medium
tags: [lighthouse, performance, core-web-vitals, trace-engine]
source_type: extracted-from-git
source_url: https://github.com/ChromeDevTools/chrome-devtools-mcp.git
source_ref: main
source_commit: 0a6aaa52ebacb2db834ffa437863e5844aa3730b
source_project: chrome-devtools-mcp
source_path: src/tools/lighthouse.ts
imported_at: 2026-04-18T00:00:00Z
---

# Lighthouse Audit Excludes Performance by Design

## Context

Lighthouse bundles five categories: performance, accessibility, SEO, best-practices, progressive-web-app. Exposing all of them via one MCP tool creates an overlap with the `performance_start_trace` tool that runs the DevTools Performance panel's TraceEngine.

## The fact / decision / pitfall

`lighthouse_audit` runs with `onlyCategories: ['accessibility', 'seo', 'best-practices']`. If the agent asks about performance, it's routed to `performance_start_trace`. Reasons:

- TraceEngine insights (LCP breakdown, DocumentLatency, ThirdParties, NetworkStall, RenderBlocking) are structured and come with actionable explanations — better for an agent to reason about than Lighthouse's opportunities.
- Running both would double-audit the page and waste budget.
- Progressive-web-app audits are rarely agent-relevant and often fail on localhost. Excluded by omission.
- The tool description explicitly tells the agent "For performance audits, run `performance_start_trace`."

## Evidence

- `src/tools/lighthouse.ts`:
```ts
const categories = ['accessibility', 'seo', 'best-practices'];
// ...
description: `Get Lighthouse score and reports for accessibility, SEO and best practices. This excludes performance. For performance audits, run ${startTrace.name}`,
```

## Implications

- Tool descriptions that cross-reference other tools by name are a legitimate pattern; route the agent explicitly instead of relying on it to pick.
- If you expose audit tools yourself, decide on tool boundaries up front; overlapping tools fight for invocation probability.
- When adding Lighthouse audits to a new project, consider the same split: static analysis + accessibility via Lighthouse, dynamic perf via raw traces.
- Lighthouse default formFactor is `mobile`; this tool switches to `desktop` by default because most agent debugging is desktop. Expose both via a `device` enum (`desktop`/`mobile`).
