---
version: 0.1.0-draft
name: accept-header-prefer-markdown-over-html
summary: For agent / LLM ingestion clients, set an Accept header with q-weighted preferences (text/markdown top, text/html next, text/plain after, */* last) so servers that support markdown negotiation return cheaper tokens directly.
category: web
confidence: medium
tags: [web, http, accept, content-negotiation, markdown, llm-ingestion]
source_type: extracted-from-git
source_url: https://github.com/microsoft/markitdown.git
source_ref: main
source_commit: 604bba13da2f43b756b49122cb65bdedb85b1dff
source_project: markitdown
source_path: packages/markitdown/src/markitdown/_markitdown.py
imported_at: 2026-04-18T00:00:00Z
---

# Accept header: prefer markdown for LLM ingestion

When a client fetches a URL for LLM consumption, convert-to-markdown on the server is strictly better than HTML-then-convert on the client: fewer tokens, less parsing, and the server already knows what's signal vs chrome. Opt in with an Accept header expressing quality-weighted preferences:

```
Accept: text/markdown, text/html;q=0.9, text/plain;q=0.8, */*;q=0.1
```

Markitdown sets this on the `requests.Session` it owns:

```python
self._requests_session.headers.update({
    "Accept": "text/markdown, text/html;q=0.9, text/plain;q=0.8, */*;q=0.1"
})
```

## What the q-values mean

| Token | q (quality) | Meaning |
|---|---|---|
| `text/markdown` | 1.0 (implicit) | "This is what I actually want." |
| `text/html;q=0.9` | 0.9 | "I'll take this if you don't speak markdown." |
| `text/plain;q=0.8` | 0.8 | "Last choice for text content." |
| `*/*;q=0.1` | 0.1 | "Anything else is fine but I'll have to transform it." |

HTTP content negotiation (RFC 9110 §12.4.2) picks the highest-q value the server can produce. Servers that support markdown rendering (e.g., Cloudflare's [markdown-for-agents](https://blog.cloudflare.com/markdown-for-agents/), some wiki engines, GitHub raw endpoints with `?plain=1`) return markdown directly; everyone else falls back to HTML.

## Why `*/*;q=0.1` instead of omitting it

- Omitting `*/*` makes the header strictly "I only accept these three types." Some servers return 406 Not Acceptable in response. That breaks your ingest for any content type you didn't list (PDFs, images, ZIPs).
- `*/*;q=0.1` keeps the door open: "If you have something else, I'll still take it — at the bottom of my preference." The downstream converter pipeline figures it out.

## Why send the header at all vs accept-everything

If your client sends no Accept header (or `Accept: */*`), markdown-aware servers have no way to know you'd prefer markdown. They default to HTML because every browser in the world sends `Accept: text/html,...`. You're leaving free wins on the table for a one-time session config.

## Per-call override

For endpoints that *only* return, say, a PDF, override per-call:

```python
resp = session.get(pdf_url, headers={"Accept": "application/pdf, */*;q=0.1"})
```

The session-level default is the right starting point; per-call overrides handle specific endpoints.

## Servers that actually negotiate

Small list of known markdown-aware endpoints as of late 2025:

- Cloudflare's markdown-for-agents program (opt-in per site).
- GitHub: `?plain=1` on raw markdown URLs (but this is a query param, not header nego).
- Some docs hosts: Docusaurus, Hugo, etc., when configured with markdown content negotiation middleware.
- Wikipedia's Parsoid API (explicit endpoint, not header nego).

Most of the public web doesn't negotiate — but setting the header costs nothing and the set of servers that do is growing.

## Related

- `content-disposition-filename-fallback` skill — the paired pattern for extracting the filename from the response.
- Search terms: "Accept header RFC 9110", "content negotiation", "markdown-for-agents Cloudflare", "quality values q-factor".
