---
version: 0.1.0-draft
name: unified-entry-dispatch-by-uri-scheme
summary: One public convert() entry point that branches on URI scheme (file:/data:/http[s]:) and input type (Path, bytes, BinaryIO, requests.Response) into specialized convert_local / convert_uri / convert_stream / convert_response methods.
category: architecture
confidence: medium
tags: [architecture, api-design, polymorphism, uri-scheme, python]
source_type: extracted-from-git
source_url: https://github.com/microsoft/markitdown.git
source_ref: main
source_commit: 604bba13da2f43b756b49122cb65bdedb85b1dff
source_project: markitdown
source_path: packages/markitdown/src/markitdown/_markitdown.py
imported_at: 2026-04-18T00:00:00Z
---

# One convert() entry point; dispatch internally by scheme + type

A small public API with a single "do the thing" method is easier to use than a library that forces the caller to think about path-vs-URL-vs-stream upfront. Markitdown's `MarkItDown.convert(source, ...)` takes `str | Path | requests.Response | BinaryIO` and routes internally:

```python
def convert(self, source, *, stream_info=None, **kwargs):
    if isinstance(source, str):
        if source.startswith(("http:", "https:", "file:", "data:")):
            return self.convert_uri(source, stream_info=stream_info, **kwargs)
        return self.convert_local(source, stream_info=stream_info, **kwargs)
    if isinstance(source, Path):
        return self.convert_local(source, stream_info=stream_info, **kwargs)
    if isinstance(source, requests.Response):
        return self.convert_response(source, stream_info=stream_info, **kwargs)
    if hasattr(source, "read") and callable(source.read) and not isinstance(source, io.TextIOBase):
        return self.convert_stream(source, stream_info=stream_info, **kwargs)
    raise TypeError(f"Invalid source type: {type(source)}. Expected str, Path, Response, or BinaryIO.")
```

And the URI variant dispatches by scheme:

```python
def convert_uri(self, uri, *, stream_info=None, **kwargs):
    uri = uri.strip()
    if uri.startswith("file:"):
        netloc, path = file_uri_to_path(uri)
        if netloc and netloc != "localhost":
            raise ValueError(f"Unsupported file URI: {uri}. Netloc must be empty or localhost.")
        return self.convert_local(path, **kwargs)
    if uri.startswith("data:"):
        mimetype, attributes, data = parse_data_uri(uri)
        base_guess = StreamInfo(mimetype=mimetype, charset=attributes.get("charset"))
        return self.convert_stream(io.BytesIO(data), stream_info=base_guess, **kwargs)
    if uri.startswith(("http:", "https:")):
        resp = self._requests_session.get(uri, stream=True)
        resp.raise_for_status()
        return self.convert_response(resp, **kwargs)
    raise ValueError(f"Unsupported URI scheme: {uri.split(':')[0]}.")
```

## Why this shape beats "pick one"

Alternative 1: force callers to pick the right method.

```python
md.convert_file("x.pdf")     # or was it convert_local?
md.convert_url("https://...")
md.convert_stream(fh, mime="application/pdf")
```

Callers now have to know their input shape upfront. The ergonomic loss is real: `md.convert(some_input)` is one line, the alternative is four lines of type-sniffing in user code.

Alternative 2: one method, accept `Any`, no type dispatch — just try things.

```python
def convert(self, source):
    try: return self._file_branch(source)
    except: ...
    try: return self._url_branch(source)
    except: ...
```

Breaks in mysterious ways; error messages are terrible ("all branches failed"). The explicit `isinstance` chain with a clear `TypeError` default is the right level of strictness.

## The rules of thumb

1. **One public method that does the dispatch.** Name it for the operation, not the input type: `convert()`, `serialize()`, `ingest()`.
2. **Branches call into specialized methods.** `convert_local`, `convert_uri`, `convert_response`, `convert_stream` — each handles its own input particulars (fetching, buffering, deriving StreamInfo).
3. **Specialized methods are also public.** Advanced users pass a pre-built `requests.Response` or a `BytesIO` to skip inference. Don't hide them.
4. **Scheme detection via startswith, not regex.** `uri.startswith("http:")` is fast, obvious, and correct; a URL regex is neither.
5. **Default to the most common case.** `str` that isn't a URL → local path. This is what 90% of users mean.
6. **Refuse ambiguity explicitly.** `file://hostname/path` with `hostname` not `localhost` → `ValueError`. Don't silently treat it as local.

## `isinstance(source, io.TextIOBase)` — why the explicit exclusion

Text-mode file objects satisfy `hasattr(s, "read")` but produce `str`, not `bytes`. Every downstream converter expects bytes. Refusing them at the dispatcher with a clear TypeError prevents a confusing decode-error deep in a converter.

## data: URI handling

```python
def parse_data_uri(uri):
    # Returns (mimetype, attributes_dict, raw_bytes)
    ...
```

A few gotchas:
- `data:,Hello%2C%20World!` → mimetype defaults to `text/plain;charset=US-ASCII`, body is URL-decoded.
- `data:text/html;base64,PGgx...` → base64 decode the body.
- Attributes other than `charset` are rare but legal (`base64` is a flag, not a k/v).

## Related

- `content-disposition-filename-fallback` skill — used by `convert_response` to derive a StreamInfo.filename.
- `filestream-seekable-buffer-fallback` skill — used by `convert_stream` to handle pipes/sockets.
- `multi-signal-mime-detection-stream-info` skill — invoked after the dispatcher has built a `base_guess`.
