---
version: 0.1.0-draft
name: magika-content-type-classifier
summary: Google's magika is a small on-device ML model (1MB, ~5ms per file) that classifies file content type from raw bytes — use it in ingestion pipelines where extensions lie, HTTP Content-Type is wrong, or files have no metadata.
category: reference
confidence: medium
tags: [reference, magika, file-type, classification, content-sniffing, ml]
source_type: extracted-from-git
source_url: https://github.com/microsoft/markitdown.git
source_ref: main
source_commit: 604bba13da2f43b756b49122cb65bdedb85b1dff
source_project: markitdown
source_path: packages/markitdown/src/markitdown/_markitdown.py
imported_at: 2026-04-18T00:00:00Z
---

# Magika: byte-level file-type classifier

[google/magika](https://github.com/google/magika) is a tiny Keras model that classifies file content types (200+ types) from a fixed-size byte prefix. Unlike `file(1)` (magic numbers) or `mimetypes.guess_type` (extension lookup), magika handles *formats without magic bytes*, *mislabeled extensions*, and *generic containers (JSON, XML)* with surprisingly good accuracy.

## How markitdown uses it

```python
import magika

self._magika = magika.Magika()       # load model once per process (~100ms startup)

# Later, in detection:
cur = file_stream.tell()
try:
    result = self._magika.identify_stream(file_stream)
    if result.status == "ok" and result.prediction.output.label != "unknown":
        mimetype = result.prediction.output.mime_type
        extensions = result.prediction.output.extensions    # list[str]
        is_text = result.prediction.output.is_text          # bool
        # ... build a StreamInfo guess from these
finally:
    file_stream.seek(cur)    # MUST restore position
```

## The `Prediction.output` shape

| Field | Type | Meaning |
|---|---|---|
| `label` | str | Internal label: `"python"`, `"ipynb"`, `"pdf"`, `"unknown"`, etc. |
| `mime_type` | str | Canonical MIME: `"text/x-python"`, `"application/json"`, `"application/pdf"`. |
| `extensions` | list[str] | Typical extensions, *without* leading dot: `["py"]`, `["ipynb"]`. |
| `is_text` | bool | Whether the file is text (useful to gate charset detection). |
| `group` | str | High-level category: `"code"`, `"document"`, `"image"`, `"audio"`, `"executable"`. |
| `description` | str | Human-readable, e.g., `"Python source"`. |

The model also produces a score (`result.prediction.score`). Markitdown ignores it and relies on a label-not-unknown check; you can use the score for ambiguity detection.

## Accuracy & scope (as of magika 0.5.x)

- ~99% top-1 accuracy on its eval set across 200+ labels.
- Fast: ~5ms per file on CPU (first call is slower due to model load).
- Model size: ~1MB; loads once per process.
- Strong on: code files (Python, Go, Rust, TypeScript, Kotlin — magic-byte-free), structured text (JSON, XML, YAML), document formats (PDF, DOCX, EPUB).
- Weak on: very short files (<16 bytes), files that are valid under multiple formats (JSON-like XML, CSV-like TSV), internal formats of proprietary tools.

## When to use magika over alternatives

| Tool | When to pick |
|---|---|
| `file(1)` / libmagic | Unix environments with magic-byte-only file types. Larger install, no ML. |
| `mimetypes.guess_type` | You only care about extension-based mapping. Fast, pure Python, no classification. |
| `python-magic` (libmagic binding) | You trust magic numbers and want C-level performance. |
| **magika** | Ingesting untrusted / mislabeled files, need mimetype for files without magic bytes (code, configs, scripts). |
| Trid / binwalk | Reverse engineering / forensics, not general classification. |

## Common ingestion patterns that use magika

```python
# Pattern 1 — trust magika, ignore user-provided extension
mimetype = magika_identify(file).mime_type

# Pattern 2 — corroborate (this is what markitdown does)
if magika_mime == provided_mime:
    guess = combined(provided, magika)            # they agree → one confident guess
else:
    guess = [provided_guess, magika_guess]         # disagreement → try both

# Pattern 3 — gate charset detection on is_text
if magika_identify(file).is_text:
    charset = charset_normalizer.detect(file.read(4096))
```

## Charset detection companion: `charset_normalizer`

For text files, markitdown pairs magika with `charset_normalizer`:

```python
import charset_normalizer, codecs

if result.prediction.output.is_text:
    file_stream.seek(cur)
    page = file_stream.read(4096)
    match = charset_normalizer.from_bytes(page).best()
    if match:
        charset = codecs.lookup(match.encoding).name    # normalize alias
```

`charset_normalizer` replaced the older `chardet` library; better accuracy on short samples and non-Western encodings.

## Install / import

```bash
pip install magika              # pulls the bundled model
```

```python
import magika
m = magika.Magika()             # loads the model
```

First import / first identify cost ~100ms. Subsequent identifies are ~5ms. Instantiate once per process.

## Anti-patterns

- **Creating a new `Magika()` per call.** Wastes the 100ms model-load each time.
- **Not restoring stream position.** `identify_stream` reads the first ~4KB; the next reader sees truncated content.
- **Trusting magika without a compatibility check.** It's accurate, not perfect. Surface disagreements instead of silently overriding caller-provided mimetypes.
- **Using it on huge files without size-capping the peek.** It reads a fixed prefix; cheap even for multi-GB inputs. But if you're running many concurrent identifies, be aware of the small but nonzero I/O.

## Related

- `multi-signal-mime-detection-stream-info` skill — the integration pattern in markitdown.
- `brute-force-format-detection-peek` skill — complementary byte-level fingerprinting for formats magika misses.
