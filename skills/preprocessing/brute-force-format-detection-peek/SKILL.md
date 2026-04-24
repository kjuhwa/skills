---
name: brute-force-format-detection-peek
description: Two-tier format detection — fast path on extension+mimetype, slow 'brute force' fallback that peeks at bytes (OLE magic, XML root element, JSON keys) and restores stream position — used when headers lie but the format has a reliable byte-level fingerprint.
category: preprocessing
version: 1.0.0
tags: [preprocessing, file-type, magic-bytes, ole, xml, fingerprint, python]
source_type: extracted-from-git
source_url: https://github.com/microsoft/markitdown.git
source_ref: main
source_commit: 604bba13da2f43b756b49122cb65bdedb85b1dff
source_project: markitdown
source_path: packages/markitdown/src/markitdown/converters/_outlook_msg_converter.py
imported_at: 2026-04-18T00:00:00Z
confidence: medium
version_origin: extracted
---

# Brute-force format detection: peek, parse, restore

When extension + mimetype aren't enough to identify a format — because the file may have no extension, a wrong extension, or a too-generic mimetype — walk down to the bytes. Two examples from markitdown:

- **Outlook .msg** — file extensions are often dropped by webmail; mimetype may be `application/octet-stream`. But .msg files are OLE compound files with a distinctive stream table that includes `__properties_version1.0` and `__recip_version1.0_#00000000`.
- **RSS/Atom** — often served as `text/xml` or `application/xml` with no specific mimetype. But the XML root element is `<rss>` or `<feed>` with `<entry>` children — a 2-line XML parse answers definitively.

## The two-tier accepts()

```python
def accepts(self, file_stream, stream_info, **kwargs) -> bool:
    mime = (stream_info.mimetype or "").lower()
    ext  = (stream_info.extension or "").lower()

    # TIER 1 — fast path, no I/O on the stream.
    if ext in PRECISE_EXTENSIONS:
        return True
    for prefix in PRECISE_MIME_PREFIXES:
        if mime.startswith(prefix):
            return True

    # TIER 2 — candidate mimetype (too-generic to be precise); peek to confirm.
    if ext in CANDIDATE_EXTENSIONS or any(mime.startswith(p) for p in CANDIDATE_MIME_PREFIXES):
        return self._peek_confirm(file_stream)

    # TIER 3 — brute force: not even mimetype matches, but try fingerprint anyway.
    return self._brute_force_confirm(file_stream)
```

## Tier 2: peek with XML root

```python
from defusedxml import minidom

def _peek_confirm(self, file_stream) -> bool:
    cur = file_stream.tell()
    try:
        doc = minidom.parse(file_stream)
        return (bool(doc.getElementsByTagName("rss")) or
                bool(doc.getElementsByTagName("feed")))
    except BaseException:
        return False
    finally:
        file_stream.seek(cur)       # INVARIANT: restore position
```

- **`defusedxml`**, not `xml.dom.minidom` — defuses XXE/billion-laughs attacks on untrusted input.
- `BaseException` catch is deliberately broad (KeyboardInterrupt included) — we're probing untrusted data, any failure means "not this format."
- `finally` block restores position even if parsing raised.

## Tier 3: OLE compound file fingerprint

```python
import olefile

def _brute_force_confirm(self, file_stream) -> bool:
    cur = file_stream.tell()
    try:
        if not olefile.isOleFile(file_stream):        # cheap magic-byte check
            return False
    finally:
        file_stream.seek(cur)

    cur = file_stream.tell()
    try:
        msg = olefile.OleFileIO(file_stream)           # expensive, opens the compound structure
        toc = "\n".join(str(s) for s in msg.listdir())
        return ("__properties_version1.0" in toc and
                "__recip_version1.0_#00000000" in toc)
    except Exception:
        return False
    finally:
        file_stream.seek(cur)
```

Two-step: `isOleFile()` is a cheap magic-byte check (D0 CF 11 E0 A1 B1 1A E1); only proceed to full parse if it returns True.

## Common byte-level fingerprints

| Format | Magic / signature | Cost to check |
|---|---|---|
| ZIP/DOCX/XLSX | Starts with `PK\x03\x04` | 4 bytes |
| PDF | Starts with `%PDF-` | 5 bytes |
| PNG | `89 50 4E 47 0D 0A 1A 0A` | 8 bytes |
| JPEG | `FF D8 FF` | 3 bytes |
| OLE compound | `D0 CF 11 E0 A1 B1 1A E1` | 8 bytes |
| XML | Starts with `<?xml ` or `<` after whitespace | 1–6 bytes |
| JSON | Strict: starts with `{` or `[` after whitespace; or contains specific keys | varies |

Prefer byte-level magic over parser-level confirmation when available — it's orders of magnitude cheaper.

## Stream-position invariant: non-negotiable

Every peek must leave the stream exactly where it started. Otherwise the next `accepts()` call gets a half-consumed stream and gives the wrong answer (or crashes). Always:

```python
cur = file_stream.tell()
try:
    # ... peek/parse ...
    pass
finally:
    file_stream.seek(cur)
```

…wrapped around every peek, even inside helper methods.

## Anti-patterns

- **Using `xml.etree.ElementTree` on untrusted input.** XXE / billion-laughs attack. Always `defusedxml`.
- **Failing to restore stream position on exception.** Causes the next converter's `accepts()` to read garbage.
- **Parsing the entire file to identify the format.** Parse just enough to confirm — usually the root element or a fixed prefix.
- **Assuming extension implies format.** Attackers rename malicious payloads to bypass extension-based filters. Byte-level fingerprint is authoritative.

## Variations

- **Magika sniffer first.** If you have content-based classifier coverage (`magika`), let it identify the format; use brute force only when it returns "unknown."
- **Size cap on peeks.** Read the first N KB into a `BytesIO` once, then run all fingerprint checks on the buffer — avoids seeking the main stream repeatedly.
- **Positive-list only.** For untrusted ingest, reject anything not on a confirmed-safe list rather than trying to detect everything.
