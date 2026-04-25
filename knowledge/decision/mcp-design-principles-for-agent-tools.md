---
version: 0.1.0-draft
name: mcp-design-principles-for-agent-tools
summary: Seven design principles that make MCP tool servers usable by LLM agents: agent-agnostic protocol, token-optimized returns, small deterministic primitives, self-healing errors, dual human+machine output, progressive complexity, and reference-over-value for heavy assets.
category: decision
confidence: high
tags: [mcp, design-principles, agent-ux, token-budget, api-design]
source_type: extracted-from-git
source_url: https://github.com/ChromeDevTools/chrome-devtools-mcp.git
source_ref: main
source_commit: 0a6aaa52ebacb2db834ffa437863e5844aa3730b
source_project: chrome-devtools-mcp
source_path: docs/design-principles.md
imported_at: 2026-04-18T00:00:00Z
---

# MCP Design Principles for Agent Tools

## Context

Designing a tool server that an LLM agent will actually use well is not the same as designing an API for humans. Descriptions cost tokens, unstable output breaks chains of thought, one "magic" tool is worse than three primitives.

## The fact / decision / pitfall

Seven principles that work in practice, in order of concreteness:

1. **Agent-agnostic API.** Use MCP or an equivalent standard. Don't bind the tool surface to one LLM's tool-calling format; interoperability is the whole point.
2. **Token-optimized.** Return semantic summaries, not raw dumps. "LCP was 3.2s" beats 50k lines of JSON trace. Large data belongs in files referenced by path.
3. **Small, deterministic blocks.** Give agents composable primitives (`click`, `screenshot`, `evaluate`) not `do_the_flow`. The agent plans; the tool executes a narrow action.
4. **Self-healing errors.** Every error should include enough context plus the suggested next action — "No recorded traces found. Record a performance trace first." Agents recover when errors tell them what to do.
5. **Human-agent collaboration.** Output is both structured JSON (for programmatic chain-of-tools) *and* human-readable Markdown (so a human supervising sees the same thing). Pair the two.
6. **Progressive complexity.** Tools are simple by default (required args only) but have optional advanced args. `take_snapshot` takes no args; `take_snapshot({verbose: true, filePath: '...'})` gives power users more.
7. **Reference over value.** For heavy assets (screenshots, traces, videos, heap snapshots), return the file path, never the bytes. Some MCP clients can display images inline — treat that as an exception.

## Evidence

- `docs/design-principles.md` — the principles themselves.
- `src/McpResponse.ts` — dual text/structured output; `filePath` parameter everywhere.
- `src/tools/snapshot.ts` — progressive complexity: `verbose` and `filePath` both optional.
- `src/tools/performance.ts` — self-healing error lines like "No recorded traces found...".
- `src/tools/slim/tools.ts` — the extreme of "small deterministic blocks" — three tools only.

## Implications

- Agent behavior against a tool surface is shaped as much by the *prompt budget* as by the surface's logical completeness. A tool you rarely fit in context never gets called.
- Adding a tool has a per-prompt cost paid by every agent call; regret-proof your tool list with a token-count regression test.
- Error messages are prompts the agent will read and act on; write them like you'd write a user-facing 4xx body.
- Expect to maintain two docs (human README + tool reference) and one codegen pipeline for both. The investment pays off when descriptions change.
