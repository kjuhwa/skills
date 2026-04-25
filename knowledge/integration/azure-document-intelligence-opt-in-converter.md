---
version: 0.1.0-draft
name: azure-document-intelligence-opt-in-converter
summary: Markitdown integrates Azure AI Document Intelligence as an opt-in, top-priority converter when the user supplies docintel_endpoint — upgrades PDF/DOCX/PPTX/XLSX/HTML/images from local parsers to server-side OCR + layout-aware markdown.
category: integration
confidence: medium
tags: [integration, azure, ocr, document-intelligence, optional, opt-in]
source_type: extracted-from-git
source_url: https://github.com/microsoft/markitdown.git
source_ref: main
source_commit: 604bba13da2f43b756b49122cb65bdedb85b1dff
source_project: markitdown
source_path: packages/markitdown/src/markitdown/converters/_doc_intel_converter.py
imported_at: 2026-04-18T00:00:00Z
---

# Azure Document Intelligence as an opt-in, top-priority converter

Markitdown ships built-in converters for PDF/DOCX/XLSX/PPTX that work without any cloud calls. When a user supplies an Azure AI Document Intelligence endpoint, a second converter (DocumentIntelligenceConverter) registers **at the top of the stack** (lowest priority value = tried first) and takes over for the formats it supports — trading local-parsing-for-free for cloud-OCR-with-better-results.

## Activation shape

```python
md = MarkItDown(
    docintel_endpoint="https://myresource.cognitiveservices.azure.com/",
    docintel_credential=AzureKeyCredential("..."),   # or DefaultAzureCredential()
    docintel_file_types=[                             # optional: restrict which types Azure handles
        DocumentIntelligenceFileType.PDF,
        DocumentIntelligenceFileType.JPEG,
        DocumentIntelligenceFileType.PNG,
    ],
    docintel_api_version="2024-11-30",                # optional: pin API version
)
```

Internally:

```python
if docintel_endpoint is not None:
    args = {"endpoint": docintel_endpoint}
    if docintel_credential is not None:  args["credential"]   = docintel_credential
    if docintel_types      is not None:  args["file_types"]   = docintel_types
    if docintel_version    is not None:  args["api_version"]  = docintel_version
    self.register_converter(DocumentIntelligenceConverter(**args))
    # priority defaults to PRIORITY_SPECIFIC_FILE_FORMAT (0.0)
    # + insert(0, ...) → this goes to the front of the tie group → runs before built-in PdfConverter etc.
```

## Supported file types (v2024-11-30)

```python
class DocumentIntelligenceFileType(str, Enum):
    # No OCR — server parses the embedded text/structure
    DOCX = "docx"
    PPTX = "pptx"
    XLSX = "xlsx"
    HTML = "html"
    # OCR — server runs layout + character recognition
    PDF = "pdf"
    JPEG = "jpeg"
    PNG = "png"
    BMP = "bmp"
    TIFF = "tiff"
```

The converter's `accepts()` returns True only for mimetypes matching the configured `file_types` list (or all of them if the list is omitted).

## When Azure beats local

| Case | Local parser | Azure DI |
|---|---|---|
| Born-digital PDF with clean text | Comparable, free | Slightly better layout but costs $ |
| Scanned PDF / image-only PDF | No text → useless | OCR extracts text |
| Complex multi-column layouts | Heuristic column detection | Much better ordering |
| Tables | mammoth/pandas OK for simple | Layout-aware, merged cells, captions |
| Handwriting | Not supported | Supported (with quality caveats) |
| Rotated / skewed scans | Broken | Handled |

## Cost vs free tradeoff

Azure Document Intelligence charges per page (pricing varies by tier). For a pipeline ingesting mostly born-digital files, skip Azure and rely on the built-ins. For a pipeline with scanned PDFs or mixed-quality sources, Azure is worth it. The opt-in design means callers decide per-pipeline, not at library-install time.

## Authentication patterns

```python
from azure.core.credentials import AzureKeyCredential
from azure.identity import DefaultAzureCredential

# Simple: API key
credential = AzureKeyCredential(os.environ["AZURE_DOCINTEL_KEY"])

# Preferred: managed identity / EntraID (works in Azure-hosted jobs + local dev with `az login`)
credential = DefaultAzureCredential()
```

`DefaultAzureCredential` tries in order: EnvironmentCredential → WorkloadIdentityCredential → ManagedIdentityCredential → SharedTokenCacheCredential → AzureCliCredential → InteractiveBrowserCredential. The same code runs in a GitHub Action (OIDC), an Azure Container App (managed identity), and a dev laptop (`az login`). Prefer this over hard-coded keys.

## Version pinning

Azure DI's API surface evolves. Pin `api_version` if your ingestion output needs to be reproducible:

```python
md = MarkItDown(docintel_endpoint=..., docintel_api_version="2024-11-30")
```

Otherwise the SDK auto-selects the latest GA version, which can silently change output formatting between runs.

## Why register at the top of the stack

Built-in specific-format converters (PdfConverter, DocxConverter) are registered first at priority 0.0. When `insert(0, DocumentIntelligenceConverter)` runs last, the DI converter ends up at the front of the priority-0 tie group. Stable sort keeps it there; `accepts()` on DI runs first; if DI can handle the format, it wins. Fall-through to the built-in only happens if DI's `accepts()` returns False (file type not in the configured list).

## Related

- `document-converter-priority-registry` skill — the registration mechanism used here.
- Alternatives: tesseract (free, local, lower quality), AWS Textract, Google Document AI, Unstructured.io — all follow the same "opt-in, top-of-stack" pattern.
