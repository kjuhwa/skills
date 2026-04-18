---
version: 0.1.0-draft
name: claude-cli-single-response-output-limit
description: Claude CLI practical output limit is ~500-800 lines per code artifact when generating multiple items in one call
category: pitfall
source:
  kind: session
  ref: "session-20260418-0000"
confidence: high
linked_skills:
  - split-llm-codegen-into-idea-plus-per-item
  - hub-make-parallel-build
tags:
  - claude-cli
  - code-generation
  - output-limit
---

**Fact:** When requesting multiple code artifacts in a single `claude -p` call, each artifact receives roughly equal share of the response capacity. Requesting 3 apps of 10,000 lines each produced 353-505 lines per app instead.

**Why:** LLM response tokens are finite per call. Requesting N large artifacts divides the available output by N. The model also tends to "summarize" later artifacts when running low on capacity.

**How to apply:** Split generation into individual calls per artifact. One idea-generation call (lightweight) followed by N code-generation calls (one per artifact) gives each the full response capacity. Realistic single-call output: ~1,500-2,000 lines for one focused artifact.

**Evidence:** auto-hub-loop cycle with "10,000 lines x 3 apps" prompt produced actual output 353, 424, 505 lines. After splitting to per-app calls, output capacity per app increased to full response window.

**Counter / Caveats:** Single small artifacts (under 500 lines) work fine in multi-item calls. The limit applies to large code generation, not to structured data or short answers.
