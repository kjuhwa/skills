---
name: image-as-data-uri-chat-completion
description: Convert a binary image stream into a base64 data URI and pass it as an image_url content-part to an OpenAI-style chat.completions endpoint, for captioning, alt-text generation, or vision tasks — with mimetype fallback and stream-position restore.
category: llm-agents
version: 1.0.0
tags: [llm-agents, vision, data-uri, openai, base64, image-captioning, python]
source_type: extracted-from-git
source_url: https://github.com/microsoft/markitdown.git
source_ref: main
source_commit: 604bba13da2f43b756b49122cb65bdedb85b1dff
source_project: markitdown
source_path: packages/markitdown/src/markitdown/converters/_llm_caption.py
imported_at: 2026-04-18T00:00:00Z
confidence: medium
version_origin: extracted
---

# Image → base64 data URI → OpenAI-style chat completion

Useful in any LLM-ingestion pipeline where you want to caption, OCR, or describe images inline with text. The code is small and hostable across OpenAI, Azure OpenAI, and OpenAI-compatible gateways (vLLM, LiteLLM, LM Studio) without change — the API shape `{"type": "image_url", "image_url": {"url": "data:..."}}` is the de-facto standard.

## The shape

```python
import base64, mimetypes
from typing import BinaryIO, Optional

def llm_caption(
    file_stream: BinaryIO,
    *,
    client,                       # OpenAI()-style client with .chat.completions.create
    model: str,
    mimetype: Optional[str] = None,
    extension: Optional[str] = None,
    prompt: Optional[str] = None,
) -> Optional[str]:
    if not prompt or not prompt.strip():
        prompt = "Write a detailed caption for this image."

    # Resolve mimetype from provided args, then extension guess, then fallback.
    ct = mimetype or (mimetypes.guess_type("_dummy" + (extension or ""))[0])
    if not ct:
        ct = "application/octet-stream"

    # Read the bytes WITHOUT consuming the caller's stream.
    cur = file_stream.tell()
    try:
        b64 = base64.b64encode(file_stream.read()).decode("utf-8")
    except Exception:
        return None
    finally:
        file_stream.seek(cur)     # INVARIANT: caller sees stream unchanged

    data_uri = f"data:{ct};base64,{b64}"

    messages = [{
        "role": "user",
        "content": [
            {"type": "text",      "text":     prompt},
            {"type": "image_url", "image_url": {"url": data_uri}},
        ],
    }]
    resp = client.chat.completions.create(model=model, messages=messages)
    return resp.choices[0].message.content
```

## The data URI format

```
data:image/png;base64,<base64-bytes>
```

- `image/png`, `image/jpeg`, `image/webp`, `image/gif` are broadly supported.
- `image/bmp`, `image/tiff` are often NOT accepted by chat vision models; prefer to convert upstream (PIL → PNG) if you need them.
- For `application/octet-stream` the model often refuses; always pass a best-guess mimetype.

## Why `file_stream.tell()` / `seek(cur)`

This function is typically called inside a format-conversion pipeline where the stream is shared across multiple handlers. Consuming the stream silently breaks the next handler. Save and restore the position with `try/finally`.

## Prompt discipline

The default prompt — "Write a detailed caption for this image" — is fine for alt-text generation. Tune it to the use case:

| Use case | Prompt |
|---|---|
| Alt-text | "Write a one-sentence description of this image suitable for alt text. Avoid 'image of' / 'picture of'." |
| OCR | "Transcribe any text in this image verbatim. Output only the transcription." |
| Chart extraction | "Describe the chart type, axes, and key data points. Output markdown." |
| Diagram → mermaid | "Output a mermaid diagram that reproduces the structure shown in this image." |

Always give the model an explicit output-shape instruction — otherwise you get prose when you wanted data.

## Size & cost

- Vision prompts cost per-image tiles (providers typically 512×512 tiles, ~170 tokens each at low detail, ~765 at high).
- Base64 inflates bytes ~33%. For a 1MB PNG you pay ~1.33MB over the wire plus per-tile prompt tokens.
- Large images are usually downsampled by the provider before billing; pre-downsampling locally saves bandwidth and cache pressure.
- Providers enforce a per-image size cap (OpenAI: 20MB). Clip before you send.

## Falling back when the model refuses

Some providers refuse `application/octet-stream` or unusual mimetypes. If `resp.choices[0].message.content` is empty or a refusal, you likely need to re-encode:

```python
from io import BytesIO
from PIL import Image

def _ensure_png(stream):
    img = Image.open(stream)
    out = BytesIO()
    img.save(out, format="PNG")
    out.seek(0)
    return out, "image/png"
```

## Anti-patterns

- **Consuming the caller's stream without restoring.** Any downstream handler that relies on the same stream gets garbage.
- **Passing a URL instead of data URI** for local-only files. Leaks local state into the prompt URL if you're not careful (`file://` paths some providers resolve server-side, some don't).
- **Trusting the extension alone for mimetype.** `.tif` files are sometimes actually PDFs; `.jpg` files are sometimes PNGs. Either sniff the content or pass the mimetype you verified upstream.
- **Ignoring empty responses.** Providers return empty strings when they refuse; treat `content == ""` as failure and retry or log.

## Variations

- **Multi-image.** Append more `{"type": "image_url", ...}` parts in the content list — the model sees them in order.
- **Cached captions.** Hash the bytes (`sha256(file_stream.read())`); cache the caption per hash+prompt. Saves a lot in batch pipelines.
- **Structured output.** Pair with `response_format={"type": "json_schema", ...}` to get typed extraction results from an image instead of free text.
