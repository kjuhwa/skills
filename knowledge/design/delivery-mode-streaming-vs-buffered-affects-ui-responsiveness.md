---
version: 0.1.0-draft
name: delivery-mode-streaming-vs-buffered-affects-ui-responsiveness
summary: Providers can deliver assistant text incrementally (streaming) or all at once (buffered); affects message timeline UX
type: knowledge
category: design
confidence: medium
tags: [design, api, ux]
source_type: extracted-from-git
source_url: https://github.com/pingdotgg/t3code.git
source_ref: main
source_commit: 9df3c640210fecccb58f7fbc735f81ca0ee011bd
source_project: t3code
imported_at: 2026-04-18
evidence:
  - .docs/encyclopedia.md
  - packages/contracts/src/orchestration.ts
---

## Fact
Sessions have an `assistantDeliveryMode` property: `streaming` or `buffered`. In streaming mode, assistant text updates the message progressively as tokens arrive. In buffered mode, the entire response is delivered at once when complete.

## Why it matters
1. **User perception of speed** — streaming makes the agent appear responsive even if total time is the same
2. **Early feedback** — user can start reading while agent is still thinking
3. **Error recovery** — if agent starts generating wrong content, user sees it early and can interrupt
4. **Data usage** — streaming sends updates incrementally; buffered sends one large payload at the end
5. **UI complexity** — streaming requires live message updates; buffered just inserts a completed message

## Evidence
- Encyclopedia: "Assistant delivery mode controls how assistant text reaches the thread timeline... `streaming` updates incrementally and `buffered` delivers a completed result"
- ProviderService manages delivery mode per session

## How to apply
- When creating a session, set `assistantDeliveryMode` based on user preference or provider capability
- In UI, if mode is streaming, listen to message updates and re-render incrementally
- If mode is buffered, wait for completion receipt, then insert full message
- Document this choice in session details; users should see whether a thread streams or buffers
- Test both modes to ensure UI doesn't break with rapid incremental updates (streaming)
