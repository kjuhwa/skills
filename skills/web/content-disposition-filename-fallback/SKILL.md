---
name: content-disposition-filename-fallback
description: Derive a best-guess filename + extension from an HTTP response by checking Content-Disposition header first, then the URL's basename, then falling back to nothing — with quote stripping and robust extraction.
category: web
version: 1.0.0
tags: [web, http, content-disposition, filename, ingestion, python]
source_type: extracted-from-git
source_url: https://github.com/microsoft/markitdown.git
source_ref: main
source_commit: 604bba13da2f43b756b49122cb65bdedb85b1dff
source_project: markitdown
source_path: packages/markitdown/src/markitdown/_markitdown.py
imported_at: 2026-04-18T00:00:00Z
confidence: medium
version_origin: extracted
---

# HTTP filename fallback chain: Content-Disposition → URL path → nothing

When ingesting a remote file you need a filename (for extension-based handler dispatch, for display, or for reporting). Servers are inconsistent about what they tell you, so follow a strict fallback chain and don't assume any one source is present.

## The chain

```python
import os, re
from urllib.parse import urlparse
import requests

def infer_filename_and_extension(response: requests.Response) -> tuple[str | None, str | None]:
    filename: str | None = None
    extension: str | None = None

    # 1. Content-Disposition header — most authoritative when present.
    cd = response.headers.get("content-disposition")
    if cd:
        m = re.search(r"filename=([^;]+)", cd)
        if m:
            filename = m.group(1).strip().strip('"').strip("'")
            _, _ext = os.path.splitext(filename)
            if _ext:
                extension = _ext

    # 2. URL path — use the last path segment if it has an extension.
    if filename is None:
        parsed = urlparse(response.url)
        _, _ext = os.path.splitext(parsed.path)
        if _ext:                                    # has-extension implies "this looks file-like"
            filename = os.path.basename(parsed.path)
            extension = _ext

    # 3. Give up — caller may rely on mimetype + content sniffing instead.
    return filename, extension
```

## Why exactly this order

- **Content-Disposition** (RFC 6266) is the server's deliberate declaration: "this should be saved as X." When present, trust it over the URL.
- **URL basename** is usually reliable for static-file servers (`/reports/q4.pdf`), but unreliable for endpoints that generate content from a slug (`/download/abc123`).
- **Nothing** — many endpoints return no filename signal at all. Your downstream code must cope with `filename = None` via mimetype-based dispatch or content sniffing (see `multi-signal-mime-detection-stream-info`).

## Edge cases covered by the regex

- `Content-Disposition: attachment; filename=report.pdf` → `report.pdf`
- `Content-Disposition: attachment; filename="report.pdf"` → `report.pdf` (`.strip('"')`)
- `Content-Disposition: attachment; filename='report.pdf'` → `report.pdf` (`.strip("'")`)
- `Content-Disposition: inline; filename=report.pdf; filename*=UTF-8''report.pdf` — the simple regex picks the first `filename=`, which is fine; `filename*` is usually the same in ASCII-named cases.

## Edge cases the simple version misses

- **`filename*` RFC 5987 encoding.** For UTF-8/Unicode names (Japanese, emoji, etc.), servers use `filename*=UTF-8''%E4%B8%AD%E6%96%87.pdf`. If you need that, use the `werkzeug.http.parse_options_header` parser or the `email.message.Message` header parser — the regex above won't decode them.
- **Semicolons in quoted values.** Pathological but legal: `filename="report; final.pdf"`. The regex `[^;]+` terminates at the first `;`. For robust parsing, use `werkzeug.http.parse_options_header` which understands the grammar.
- **Missing path extension.** URLs like `/downloads/12345` have no extension in the path. You'll get `filename = None`; that's correct.
- **Query strings.** `urlparse(...).path` excludes the query, so `?download=1` doesn't corrupt the basename.

## Robust variant (recommended for production)

```python
from werkzeug.http import parse_options_header

def infer_filename_and_extension_robust(response):
    cd = response.headers.get("content-disposition", "")
    _, params = parse_options_header(cd)
    filename = params.get("filename*") or params.get("filename")
    if filename:
        _, ext = os.path.splitext(filename)
        return filename, ext or None

    parsed = urlparse(response.url)
    _, ext = os.path.splitext(parsed.path)
    if ext:
        return os.path.basename(parsed.path), ext
    return None, None
```

`parse_options_header` handles RFC 5987 encoding and quoted values correctly.

## Putting it together with mimetype

```python
def stream_info_from_response(resp):
    filename, extension = infer_filename_and_extension(resp)
    mimetype, charset = None, None
    if "content-type" in resp.headers:
        parts = resp.headers["content-type"].split(";")
        mimetype = parts.pop(0).strip()
        for part in parts:
            if part.strip().startswith("charset="):
                v = part.split("=", 1)[1].strip()
                if v: charset = v
    return StreamInfo(
        mimetype=mimetype, extension=extension, charset=charset,
        filename=filename, url=resp.url,
    )
```

## Anti-patterns

- **Trusting `url.split("/")[-1]` as the filename.** Doesn't handle query strings; doesn't detect "this path doesn't point to a file."
- **Using `response.url.endswith(".pdf")` to pick a handler.** Query strings (`?v=2`) break this; some servers redirect `.pdf` URLs to a generated endpoint without an extension.
- **Downloading before filename extraction.** The URL and headers give you what you need to pick a handler *before* streaming gigabytes.
- **Ignoring quotes in Content-Disposition.** Raw `filename="report.pdf"` becomes `"report.pdf"` (with literal quotes) unless you strip.

## Variations

- **For streaming APIs** (no Content-Disposition, no extension), fall straight to content sniffing (`magika`) on the first buffered chunk.
- **For S3 / presigned URLs**, parse the URL *path* ignoring the query signature: `urlparse(url).path` already does this.
- **For proxied downloads**, pass `response.history[-1].url` if you want the original URL rather than the final-redirect URL.
