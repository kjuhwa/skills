---
version: 0.1.0-draft
name: markitdown-converter-architecture
summary: Reference overview of how Microsoft's markitdown library orchestrates document-to-markdown conversion — StreamInfo guesses, priority-based converter registry, accepts()/convert() contract, plugin loader, and format-specific converters.
category: reference
confidence: medium
tags: [reference, markitdown, architecture, converters, pipeline, microsoft]
source_type: extracted-from-git
source_url: https://github.com/microsoft/markitdown.git
source_ref: main
source_commit: 604bba13da2f43b756b49122cb65bdedb85b1dff
source_project: markitdown
source_path: packages/markitdown/src/markitdown/_markitdown.py
imported_at: 2026-04-18T00:00:00Z
---

# Markitdown converter architecture — reference sketch

Microsoft's markitdown is a batteries-included document-to-markdown library aimed at LLM ingestion. The public surface is tiny (`MarkItDown().convert(...)`) but the internals are a clean example of how to build a pluggable, format-agnostic ingestion pipeline. This is a reference outline for cross-linking from related skills.

## Package layout

```
packages/
├── markitdown/                     # core library
│   └── src/markitdown/
│       ├── _markitdown.py          # orchestrator (MarkItDown class)
│       ├── _base_converter.py      # DocumentConverter ABC + DocumentConverterResult
│       ├── _stream_info.py         # frozen dataclass: mimetype/extension/charset/filename/...
│       ├── _exceptions.py          # FileConversionException, MissingDependencyException, ...
│       ├── _uri_utils.py           # parse_data_uri, file_uri_to_path
│       └── converters/             # one file per format
│           ├── _html_converter.py       (PRIORITY_GENERIC = 10)
│           ├── _plain_text_converter.py (PRIORITY_GENERIC = 10)
│           ├── _zip_converter.py        (PRIORITY_GENERIC = 10)
│           ├── _pdf_converter.py        (PRIORITY_SPECIFIC = 0)
│           ├── _docx_converter.py       (PRIORITY_SPECIFIC = 0)  # extends HtmlConverter
│           ├── _xlsx_converter.py                                # pandas + openpyxl
│           ├── _pptx_converter.py
│           ├── _ipynb_converter.py
│           ├── _outlook_msg_converter.py                         # olefile brute-force detect
│           ├── _rss_converter.py                                 # XML root-element peek
│           ├── _wikipedia_converter.py                           # URL-gated
│           ├── _youtube_converter.py                             # URL-gated
│           ├── _bing_serp_converter.py                           # URL-gated
│           ├── _image_converter.py                               # exiftool + llm_caption
│           ├── _audio_converter.py                               # exiftool + transcribe
│           ├── _doc_intel_converter.py                           # Azure Document Intelligence (opt-in)
│           ├── _epub_converter.py
│           ├── _csv_converter.py
│           ├── _markdownify.py                                   # custom MarkdownConverter subclass
│           ├── _llm_caption.py                                   # image → data URI → chat completion
│           └── _transcribe_audio.py                              # speech → text
├── markitdown-mcp/                 # MCP server wrapper
├── markitdown-ocr/                 # OCR add-on
└── markitdown-sample-plugin/       # plugin template
```

## End-to-end pipeline

```
MarkItDown.convert(source)  ─┬─ str (http/https/file/data:)  ──→ convert_uri()
                              ├─ pathlib.Path                 ──→ convert_local()
                              ├─ requests.Response            ──→ convert_response()
                              └─ BinaryIO                     ──→ convert_stream()
                                                                        │
                 HTTP: fetch, parse Content-Type / Content-Disposition  │
                 file: read as bytes                                    │
                 data: base64-decode, parse mediatype                   │
                                                                        ▼
             ┌─ _get_stream_info_guesses() ─ magika + charset_normalizer ─┐
             │                                                              │
             │ Returns List[StreamInfo] (multiple guesses if ambiguous)    │
             ▼                                                              │
   for stream_info in guesses + [StreamInfo()]:                             │
       for reg in sorted(self._converters, key=priority):                   │
           if reg.converter.accepts(file_stream, stream_info, **kwargs):    │
               return reg.converter.convert(file_stream, stream_info, **kw) │
                                                                            │
   raise UnsupportedFormatException                                         │
```

## Entry-point plugin loading

Plugins are loaded lazily via `importlib.metadata.entry_points(group="markitdown.plugin")`. Enabled by passing `enable_plugins=True` to `MarkItDown(...)`, or from the CLI with `--use-plugins`, or from the MCP server via env `MARKITDOWN_ENABLE_PLUGINS=true`. Plugin packages declare:

```toml
[project.entry-points."markitdown.plugin"]
my_plugin = "my_plugin_module"
```

and export `__plugin_interface_version__ = 1` + `register_converters(markitdown, **kwargs)`.

## Priority numbering

| Constant | Value | Meaning |
|---|---|---|
| `PRIORITY_SPECIFIC_FILE_FORMAT` | 0.0 | Specific: PDF, DOCX, Wikipedia, YouTube |
| `PRIORITY_GENERIC_FILE_FORMAT`  | 10.0 | Generic: text/*, HTML, ZIP |

**Lower value = tried first.** Plugins can pick any float to slot themselves in. `insert(0, registration)` at equal priority means most-recent registration wins the tie, so plugins transparently shadow built-ins.

## Result shape

```python
@dataclass
class DocumentConverterResult:
    markdown: str
    title: Optional[str] = None

    @property
    def text_content(self) -> str:   # soft-deprecated alias for `markdown`
        return self.markdown
```

## Normalization passes after a successful convert()

After the winning converter returns, the orchestrator runs two cleanup passes:

```python
res.text_content = "\n".join(line.rstrip() for line in re.split(r"\r?\n", res.text_content))
res.text_content = re.sub(r"\n{3,}", "\n\n", res.text_content)
```

Trailing whitespace stripped per line; runs of 3+ newlines collapsed to 2. Normalization happens once at the orchestrator, so individual converters don't need to implement it.

## Reusable patterns extracted

Cross-reference the skills extracted from this codebase:

- `architecture/document-converter-priority-registry` — the priority + stable-sort registry
- `architecture/accepts-then-convert-two-phase-dispatch` — the accepts()/convert() contract
- `preprocessing/multi-signal-mime-detection-stream-info` — StreamInfo + magika pipeline
- `plugin-architecture/python-entrypoint-plugin-loader` — the plugin discovery pattern
- `python/optional-dependency-deferred-exception` — lazy-fail on missing extras
- `python/filestream-seekable-buffer-fallback` — unseekable stream handling
- `mcp/fastmcp-stdio-http-dual-transport` — the MCP server wrapper
- `llm-agents/image-as-data-uri-chat-completion` — LLM captioning
- `data-pipeline/zip-recursive-subdocument-conversion` — ZipConverter recurses through registry
- `data-pipeline/ipynb-cells-to-markdown` — Jupyter notebook renderer
- `web/content-disposition-filename-fallback` — HTTP filename extraction
- `preprocessing/html-to-markdown-markdownify-subclass` — customized markdownify
- `preprocessing/brute-force-format-detection-peek` — byte-level fingerprinting
