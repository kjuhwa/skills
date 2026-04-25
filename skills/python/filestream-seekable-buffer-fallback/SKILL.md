---
name: filestream-seekable-buffer-fallback
description: If an input stream isn't seekable, slurp it into BytesIO before entering any multi-pass pipeline — lets every downstream consumer use tell()/seek() without worrying whether the source was a pipe, socket, or chunked HTTP body.
category: python
version: 1.0.0
tags: [python, streams, bytesio, seekable, binaryio, ingestion]
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

# Seekable-buffer fallback for unseekable streams

In a pipeline that dispatches to multiple handlers — each of which needs to peek at the stream, then rewind — you need `tell()`/`seek()`. Files are seekable; pipes, sockets, chunked HTTP bodies, and most generators aren't. The idiom: at the very top of the pipeline, check `stream.seekable()` and if not, buffer the whole thing into `BytesIO` once. Every handler downstream now gets a uniform, seekable stream.

## The one-liner

```python
import io

def _ensure_seekable(stream):
    if stream.seekable():
        return stream
    buf = io.BytesIO()
    while True:
        chunk = stream.read(4096)
        if not chunk:
            break
        buf.write(chunk)
    buf.seek(0)
    return buf
```

Call it once at the pipeline entry:

```python
def convert_stream(self, stream, **kwargs):
    stream = _ensure_seekable(stream)      # buffer if necessary, no-op if already seekable
    # ... proceed; every converter's accepts()/convert() can peek freely
```

## Why you need it

Many format-detection pipelines call `accepts(file_stream, ...)` on many candidate handlers. Each `accepts()` may `read(N)` to peek, then `seek(cur_pos)` to restore. If the stream doesn't support `seek`, the second `accepts()` call gets garbage. The buffer materializes a seekable interface in the one place that needs it.

## Common callers of unseekable streams

| Source | Seekable? | Common fix |
|---|---|---|
| `open(path, "rb")` | Yes | — |
| `subprocess.Popen(stdout=PIPE).stdout` | No | Buffer. |
| `requests.Response.raw` | No | Use `response.iter_content()` → BytesIO, or pass `stream=True` + buffer. |
| `urllib.request.urlopen(url)` | No | Buffer. |
| `socket.makefile("rb")` | No | Buffer. |
| `io.BytesIO(b)` | Yes | — |

## HTTP-specific variant (requests)

```python
def response_to_seekable(resp):
    buf = io.BytesIO()
    for chunk in resp.iter_content(chunk_size=512):
        buf.write(chunk)
    buf.seek(0)
    return buf
```

Skip `response.raw`; it's not seekable and has cross-version quirks around decompression. Always buffer from `iter_content`.

## Memory-bounded variant

The blunt version loads the whole stream into memory. For inputs larger than RAM, swap in a spillable temp file:

```python
import tempfile

def _ensure_seekable_bounded(stream, *, memlimit=100 * 1024 * 1024):
    if stream.seekable():
        return stream
    buf = tempfile.SpooledTemporaryFile(max_size=memlimit)    # spills to disk past memlimit
    while True:
        chunk = stream.read(1024 * 1024)
        if not chunk:
            break
        buf.write(chunk)
    buf.seek(0)
    return buf
```

`SpooledTemporaryFile` is `BinaryIO`-compatible and seekable throughout, so handlers don't see a difference.

## When you don't need the buffer

- **Single-pass, no peek.** If every handler reads forward-only to EOF, don't bother — you save the memory.
- **Very large inputs that would spill to disk.** Prefer to decide the handler from metadata (path, URL, Content-Type) without peeking; keep the stream streaming.
- **Pipes whose source emits slowly.** Buffering blocks until EOF; breaks interactive streaming.

## Anti-patterns

- **Calling `.seek(0)` without checking `.seekable()`.** Raises on pipes.
- **`stream.read()` to slurp once, then passing bytes everywhere.** Type mismatch — handlers now have to special-case `BinaryIO` vs `bytes`. The `BytesIO` wrapper avoids that.
- **Buffering inside each handler.** Every handler pays the I/O cost and the memory. Buffer once at the top.
- **Not resetting position after buffering.** `BytesIO` starts at `tell() == end-of-buffer` after the fill loop. Always `buf.seek(0)`.

## Variations

- **Async streams.** Use `anyio.BufferedByteReceiveStream` or buffer into `BytesIO` before handing off to sync handlers.
- **Known-size upper bound.** If your protocol advertises a size (Content-Length), preallocate `BytesIO(b"\0" * size)` and `writeinto`.
- **Very-large chunked reads.** Tune the chunk size to your I/O pattern; 4KB is fine for typical cases, 1MB is better for large binary uploads.
