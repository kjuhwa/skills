---
tags: [frontend, sse, fetch, streaming]
name: sse-fetch-streaming
description: Fetch-based Server-Sent Events streaming with pause/resume/close control for real-time chat and data feeds
triggers:
  - sse
  - server-sent events
  - streaming
  - event stream
  - real-time chat
category: frontend
version: 1.0.0
source_project: lucida-ui
---

# SSE Fetch Streaming

## Purpose

Implement Server-Sent Events using the Fetch API (not EventSource) for POST-capable streaming with pause/resume/close control. Suitable for AI chat responses, real-time data feeds, and progressive loading.

## When to Use

- Need SSE with POST requests (EventSource only supports GET)
- Want pause/resume control over the stream
- Building AI chat UIs with streaming responses
- Need custom header injection (auth tokens, locale)

## Pattern

See `content.md` for full implementation.
