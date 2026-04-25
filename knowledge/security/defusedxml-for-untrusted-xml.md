---
version: 0.1.0-draft
name: defusedxml-for-untrusted-xml
summary: Always use defusedxml (not xml.etree.ElementTree / xml.dom.minidom) when parsing XML from untrusted sources — defuses XXE, billion-laughs, quadratic-blowup, and external-entity attacks that stdlib parsers accept by default.
category: security
confidence: medium
tags: [security, xml, defusedxml, xxe, billion-laughs, ingestion]
source_type: extracted-from-git
source_url: https://github.com/microsoft/markitdown.git
source_ref: main
source_commit: 604bba13da2f43b756b49122cb65bdedb85b1dff
source_project: markitdown
source_path: packages/markitdown/src/markitdown/converters/_rss_converter.py
imported_at: 2026-04-18T00:00:00Z
---

# Use defusedxml for any XML from outside your trust boundary

Python's stdlib XML parsers (`xml.etree.ElementTree`, `xml.dom.minidom`, `xml.sax`) default to behaviors that are **unsafe** for untrusted input: they resolve external entities, expand nested entities without bounds, and allow DTDs to load network resources. An attacker-controlled XML document can:

- **XXE (XML External Entity)** — read local files, exfiltrate via HTTP.
- **Billion-laughs** — exponential entity expansion; kills the process with memory/CPU.
- **Quadratic blowup** — similar to billion-laughs but with multiplied expansion of a single entity.
- **DTD retrieval** — fetch arbitrary URLs during parsing, SSRF from your parser.

The fix is `defusedxml`, a drop-in wrapper that disables these behaviors:

```python
from defusedxml import minidom                    # not xml.dom.minidom
from defusedxml.ElementTree import parse, fromstring   # not xml.etree.ElementTree

doc = minidom.parse(file_stream)                  # safe; XXE blocked
root = fromstring(user_bytes)                      # safe; billion-laughs blocked
```

Markitdown's RSS/Atom converter does exactly this:

```python
from defusedxml import minidom

def _check_xml(self, file_stream):
    cur = file_stream.tell()
    try:
        doc = minidom.parse(file_stream)
        return self._feed_type(doc) is not None
    except BaseException:
        return False
    finally:
        file_stream.seek(cur)
```

## Minimal example of what defusedxml blocks

```xml
<!DOCTYPE foo [
  <!ELEMENT foo ANY >
  <!ENTITY xxe SYSTEM "file:///etc/passwd" >
]>
<foo>&xxe;</foo>
```

- Stdlib parser with default resolver: reads `/etc/passwd` into the document.
- `defusedxml`: raises `DefusedXmlException` (or a subclass like `EntitiesForbidden`) before retrieval happens.

Another one — billion laughs:

```xml
<!DOCTYPE lolz [
  <!ENTITY lol "lol">
  <!ENTITY lol2 "&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;">
  <!ENTITY lol3 "&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;">
  ...
]>
<lolz>&lol9;</lolz>
```

Stdlib parser expands to ~3GB of "lol" strings in memory. `defusedxml` blocks at the DTD/entity declaration.

## Package landscape

```bash
pip install defusedxml
```

The package provides hardened replacements for:

| Stdlib module | defusedxml module |
|---|---|
| `xml.etree.ElementTree` | `defusedxml.ElementTree` |
| `xml.sax` | `defusedxml.sax` |
| `xml.dom.minidom` | `defusedxml.minidom` |
| `xml.dom.pulldom` | `defusedxml.pulldom` |
| `xml.dom.expatbuilder` | `defusedxml.expatbuilder` |
| lxml (third-party) | `defusedxml.lxml` (deprecated; use lxml's own no-resolve flags) |

## When NOT to use defusedxml

- **Trusted, internal config files.** Your own build's `config.xml` read from disk. No attacker-controlled path.
- **lxml users.** The `defusedxml.lxml` module is deprecated and unreliable. For lxml, use `lxml.etree.XMLParser(resolve_entities=False, no_network=True)` directly.
- **Schema validation with external schemas.** defusedxml blocks external-schema fetch by design. If you need schema loading, explicitly allow it via `forbid_external=False` (understand the tradeoff).

## What else to remember

- **DTD-less modern feeds.** Most RSS/Atom feeds in the wild don't use DTDs or entities. Disabling DTD processing rarely breaks anything real.
- **Size caps on top.** defusedxml doesn't cap the document size itself — an attacker can still send a 10GB valid XML. Combine with a max-bytes read at ingestion.
- **Catch broadly.** `defusedxml` raises `DefusedXmlException` subclasses; markitdown's converter catches `BaseException` for maximum resilience during format probing. In production code, catch `Exception` at minimum and log.

## Anti-patterns

- **`xml.etree.ElementTree.fromstring(user_bytes)`.** Every security review will flag this. XXE is default-on.
- **"I'll disable external entities by setting...".** Stdlib XML parsers have inconsistent knobs across Python versions. `defusedxml` centralizes the hardening.
- **Parsing the same document twice — once defused, once not.** The second parse defeats the first. If you need richer parsing, use `defusedxml.ElementTree` end-to-end.

## Related

- `brute-force-format-detection-peek` skill — the peek-with-restore pattern markitdown uses alongside defusedxml.
- Python security: `pickle` has the same untrusted-input problem. Never unpickle external data.
