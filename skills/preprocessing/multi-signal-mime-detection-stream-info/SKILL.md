---
name: multi-signal-mime-detection-stream-info
description: Combine extension, HTTP headers, content-disposition, mimetypes.guess_type(), magika content sniffing, and charset_normalizer into an ordered list of StreamInfo guesses that converters try in turn.
category: preprocessing
version: 1.0.0
tags: [preprocessing, mime, file-type, detection, magika, charset, python]
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

# Multi-signal MIME + charset detection → list of StreamInfo guesses

Don't trust a single source of truth for "what is this file." Merge extension, HTTP `Content-Type`, `Content-Disposition`, `mimetypes.guess_type()`, a content-sniffing classifier (Google's `magika`), and `charset_normalizer` into a small `StreamInfo` dataclass, then produce an **ordered list of guesses** that converters iterate through. If the caller's signal and the sniffed signal disagree, emit both — and let the dispatcher try both in sequence.

## The dataclass

```python
from dataclasses import dataclass, asdict

@dataclass(kw_only=True, frozen=True)
class StreamInfo:
    mimetype:   Optional[str] = None
    extension:  Optional[str] = None   # with leading "."
    charset:    Optional[str] = None
    filename:   Optional[str] = None   # from path, URL, or Content-Disposition
    local_path: Optional[str] = None
    url:        Optional[str] = None

    def copy_and_update(self, *others, **kwargs):
        new = asdict(self)
        for si in others:
            new.update({k: v for k, v in asdict(si).items() if v is not None})
        new.update(kwargs)
        return StreamInfo(**new)
```

Frozen + kw_only so guesses are immutable and construction is self-documenting. `copy_and_update` merges two partial views without the caller caring which keys were None.

## Signal sources

| Source | Gives you | Gotcha |
|---|---|---|
| File path | `local_path`, `extension`, `filename` | Extensions lie |
| URL | `url`, sometimes `extension`, `filename` | Query strings, `/foo` with no extension |
| HTTP `Content-Type` | `mimetype`, `charset` | Servers lie, `application/octet-stream` is common |
| HTTP `Content-Disposition` | `filename`, sometimes `extension` | URL-encoded, quoted, optional |
| `mimetypes.guess_type(path)` | `mimetype` from `extension` | Only canonical extensions |
| `magika.identify_stream()` | `mimetype`, `extension`, `is_text` | Stream position changes — restore it |
| `charset_normalizer` on a 4KB peek | `charset` for text files | Costly if stream is huge |

## The pipeline

```python
def _get_stream_info_guesses(file_stream, base_guess: StreamInfo) -> List[StreamInfo]:
    guesses = []

    # Step 1 — fill in extension↔mimetype from stdlib, where one is missing.
    enhanced = base_guess.copy_and_update()
    if base_guess.mimetype is None and base_guess.extension is not None:
        m, _ = mimetypes.guess_type("placeholder" + base_guess.extension, strict=False)
        if m: enhanced = enhanced.copy_and_update(mimetype=m)
    if base_guess.mimetype is not None and base_guess.extension is None:
        exts = mimetypes.guess_all_extensions(base_guess.mimetype, strict=False)
        if exts: enhanced = enhanced.copy_and_update(extension=exts[0])

    # Step 2 — sniff the bytes. MUST restore stream position.
    cur = file_stream.tell()
    try:
        result = magika.Magika().identify_stream(file_stream)
        if result.status == "ok" and result.prediction.output.label != "unknown":
            sniffed_mime = result.prediction.output.mime_type
            sniffed_ext  = "." + result.prediction.output.extensions[0] if result.prediction.output.extensions else None
            sniffed_charset = None
            if result.prediction.output.is_text:
                file_stream.seek(cur)
                page = file_stream.read(4096)
                cr = charset_normalizer.from_bytes(page).best()
                if cr: sniffed_charset = codecs.lookup(cr.encoding).name

            # Compatibility check — if caller told us a different mimetype/extension,
            # emit both guesses instead of overriding.
            compatible = (
                (base_guess.mimetype  is None or base_guess.mimetype == sniffed_mime) and
                (base_guess.extension is None or base_guess.extension.lstrip(".") in result.prediction.output.extensions) and
                (base_guess.charset   is None or base_guess.charset == sniffed_charset)
            )
            if compatible:
                guesses.append(StreamInfo(
                    mimetype=base_guess.mimetype or sniffed_mime,
                    extension=base_guess.extension or sniffed_ext,
                    charset=base_guess.charset or sniffed_charset,
                    filename=base_guess.filename, local_path=base_guess.local_path, url=base_guess.url,
                ))
            else:
                # Incompatible — try both
                guesses.append(enhanced)
                guesses.append(StreamInfo(
                    mimetype=sniffed_mime, extension=sniffed_ext, charset=sniffed_charset,
                    filename=base_guess.filename, local_path=base_guess.local_path, url=base_guess.url,
                ))
        else:
            guesses.append(enhanced)   # sniffer said "unknown"; fall back
    finally:
        file_stream.seek(cur)          # INVARIANT: caller sees stream unchanged

    return guesses
```

## How the dispatcher uses the list

```python
for si in guesses + [StreamInfo()]:            # try an empty guess as last resort
    for reg in sorted_converters:
        if reg.converter.accepts(file_stream, si, **kwargs):
            return reg.converter.convert(file_stream, si, **kwargs)
raise UnsupportedFormatException
```

The extra empty `StreamInfo()` at the end is a "null" guess — lets a catch-all converter try without any metadata at all.

## Why not just pick one signal?

- **Extension-only**: misses content-sniffable files (no extension) and is wrong when the extension lies (e.g., `.txt` holding JSON).
- **Magika-only**: strong classifier, but if the file is a format it wasn't trained on it returns "unknown."
- **HTTP-Content-Type-only**: many servers return `application/octet-stream` or wrong types; need to corroborate.

Emitting multiple guesses lets downstream converters disagree with the ambiguity without the detector having to resolve it prematurely.

## Anti-patterns

- **Mutating the stream position without restoring.** Every consumer must save/restore `tell()`.
- **Returning a single "best guess" from the detector.** Collapses disagreement; drops the correct answer when the majority vote is wrong.
- **Guessing charset without peeking content.** HTTP charset is often missing or wrong; always read a page and let `charset_normalizer` decide.
- **Trusting `Content-Disposition`'s filename verbatim.** Strip quotes, URL-decode, and parse only the `filename=` token.

## Variations

- **Async streams**: same pattern with `aiofiles` or `anyio` byte streams; save/restore becomes `await stream.tell()`/`await stream.seek(...)`.
- **Very large files**: skip `magika` and fall back to extension+mime only above a size threshold.
- **Strict mode**: for security-sensitive ingest, require caller-provided mimetype + magika agreement; refuse incompatible.
