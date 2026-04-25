---
name: html-to-markdown-markdownify-subclass
description: Subclass markdownify.MarkdownConverter to customize link escape, drop javascript/data URIs, convert input[type=checkbox] to GFM task syntax, and fall back to plain text on deeply-nested HTML.
category: preprocessing
version: 1.0.0
tags: [preprocessing, html, markdown, markdownify, beautifulsoup, python]
source_type: extracted-from-git
source_url: https://github.com/microsoft/markitdown.git
source_ref: main
source_commit: 604bba13da2f43b756b49122cb65bdedb85b1dff
source_project: markitdown
source_path: packages/markitdown/src/markitdown/converters/_markdownify.py
imported_at: 2026-04-18T00:00:00Z
confidence: medium
version_origin: extracted
---

# Custom markdownify subclass for LLM-ready HTML→Markdown

`markdownify` does a good-enough job out of the box, but for LLM ingestion you usually want to: strip JS links so prompts don't echo them, truncate inline data URIs so images don't blow the context budget, escape URIs so markdown doesn't get broken by unusual characters, and render `<input type=checkbox>` as GFM `[x]`/`[ ]` so checklists survive. Subclass `MarkdownConverter` and override four converters; wrap with a strict/fallback switch for the RecursionError case.

## The subclass

```python
import re
import markdownify
from urllib.parse import quote, unquote, urlparse, urlunparse

class _CustomMarkdownify(markdownify.MarkdownConverter):
    def __init__(self, **options):
        options["heading_style"] = options.get("heading_style", markdownify.ATX)  # # not ====
        options["keep_data_uris"] = options.get("keep_data_uris", False)
        super().__init__(**options)

    def convert_hn(self, n, el, text, convert_as_inline=False, **kw):
        # Force a blank line before headings so they aren't swallowed into prior paragraph.
        if not convert_as_inline and not re.search(r"^\n", text):
            return "\n" + super().convert_hn(n, el, text, convert_as_inline)
        return super().convert_hn(n, el, text, convert_as_inline)

    def convert_a(self, el, text, convert_as_inline=False, **kw):
        prefix, suffix, text = markdownify.chomp(text)
        if not text: return ""
        if el.find_parent("pre") is not None: return text
        href, title = el.get("href"), el.get("title")
        if href:
            try:
                p = urlparse(href)
                # Drop javascript:, mailto: as plain text.
                if p.scheme and p.scheme.lower() not in ("http", "https", "file"):
                    return f"{prefix}{text}{suffix}"
                # Re-escape path to keep markdown parsers happy.
                href = urlunparse(p._replace(path=quote(unquote(p.path))))
            except ValueError:
                return f"{prefix}{text}{suffix}"
        if self.options["autolinks"] and text.replace(r"\_", "_") == href and not title:
            return f"<{href}>"
        title_part = f' "{title.replace(chr(34), chr(92)+chr(34))}"' if title else ""
        return f"{prefix}[{text}]({href}{title_part}){suffix}" if href else text

    def convert_img(self, el, text, convert_as_inline=False, **kw):
        alt = (el.attrs.get("alt") or "").replace("\n", " ")
        src = el.attrs.get("src") or el.attrs.get("data-src") or ""
        title = el.attrs.get("title") or ""
        title_part = f' "{title}"' if title else ""
        if convert_as_inline and el.parent.name not in self.options["keep_inline_images_in"]:
            return alt
        # Truncate long data URIs — they eat LLM context budget for no value.
        if src.startswith("data:") and not self.options["keep_data_uris"]:
            src = src.split(",", 1)[0] + "..."
        return f"![{alt}]({src}{title_part})"

    def convert_input(self, el, text, convert_as_inline=False, **kw):
        # GFM task-list checkbox syntax
        if el.get("type") == "checkbox":
            return "[x] " if el.has_attr("checked") else "[ ] "
        return ""
```

## Driver with recursion fallback

`markdownify` is recursive; deeply-nested HTML (nested tables, SPA-rendered containers) can blow Python's recursion limit. Catch it and fall back to BeautifulSoup's iterative `get_text` so the caller still gets usable text instead of raw HTML:

```python
import warnings
from bs4 import BeautifulSoup

def convert_html(html_bytes: bytes, *, charset="utf-8", strict=False, **kw) -> str:
    soup = BeautifulSoup(html_bytes, "html.parser", from_encoding=charset)
    for tag in soup(["script", "style"]):      # strip noise first
        tag.extract()
    target = soup.find("body") or soup
    try:
        return _CustomMarkdownify(**kw).convert_soup(target).strip()
    except RecursionError:
        if strict: raise
        warnings.warn(
            "HTML too deeply nested for markdown conversion; falling back to plain text.",
            stacklevel=2,
        )
        return target.get_text("\n", strip=True).strip()
```

## Why these four overrides

| Override | What it prevents | Default behavior that's wrong |
|---|---|---|
| `convert_hn` | Heading glued onto prior paragraph | Output `foo## Heading` with no blank line |
| `convert_a` | LLM prompts leaking `javascript:` payloads, or URLs breaking markdown link syntax via unescaped characters | Renders the raw href as-is |
| `convert_img` | Multi-megabyte `data:image/png;base64,...` eating context | Keeps the whole data URI verbatim |
| `convert_input` | Task lists becoming empty | Returns empty string for checkboxes |

## Call-site usage

The subclass plugs into any HTML→Markdown driver. For DOCX, many tools convert to HTML first (e.g. `mammoth.convert_to_html(...)`) and then run this subclass; same for XLSX (pandas `to_html` → markdown). Reusing the same formatter gives you consistent output across source formats.

## Anti-patterns

- **Using `markdownify.markdownify(html)` (module-level helper) with options passed inline.** You lose the ability to keep state across sub-document calls. Instantiate the subclass once.
- **Stripping scripts/styles after markdownify.** You've already paid for parsing/escaping noise you didn't want.
- **Not catching `RecursionError`.** One pathological input kills the whole ingestion pipeline.
- **Keeping data URIs in images.** A single PNG base64 is frequently 100k+ tokens.

## Variations

- **Keep some data URIs.** Pass `keep_data_uris=True` via options when you actually need the pixels (OCR, downstream captioning).
- **Image captioning hook.** In place of `src = split(",")[0] + "..."`, call an LLM-caption pipeline (see companion skill `image-as-data-uri-chat-completion`) and emit `![caption](src)` instead.
- **Custom table flattening.** Override `convert_table` to linearize rows with pipe separators if the target is a plain-text LLM instead of GFM-aware.
