---
name: multilingual-tts-text-normalize-and-split
description: Multilingual TTS text normalization via wetext + inflect with budget-aware paragraph splitting
category: text-normalization
version: 1.0.0
tags: [text-normalization, tts, multilingual, chinese, nlp]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/OpenBMB/VoxCPM.git
source_ref: main
source_commit: 13605c5a0e6b99d6d3527a43bd1a4e0e69c8800e
source_project: VoxCPM
source_paths:
  - src/voxcpm/utils/text_normalize.py
imported_at: 2026-04-18T00:00:00Z
version_origin: extracted
---

# Multilingual text normalization via wetext + inflect, with budget-aware paragraph splitting

## When to use
Use this pipeline when feeding raw user text to a TTS model that:
1. Expects normalized text (numbers as words, no special characters)
2. Processes text in chunks due to context length limits
3. Needs to handle Chinese and English (or other CJK + Latin mixes) in the same string

The budget-aware splitter prevents OOM on long inputs and keeps chunk lengths predictable for batching.

## Pattern

### Language detection
```python
import re

_CJK_RANGE = re.compile(r'[\u4e00-\u9fff\u3400-\u4dbf\uff00-\uffef\u3000-\u303f]')

def detect_language(text: str) -> str:
    """Returns 'zh' for predominantly Chinese text, 'en' otherwise."""
    cjk_count = len(_CJK_RANGE.findall(text))
    return "zh" if cjk_count / max(len(text), 1) > 0.3 else "en"
```

### Number normalization
```python
import inflect

_inflect = inflect.engine()

def normalize_numbers_en(text: str) -> str:
    """Replace digits with English words."""
    def _replace(m):
        return _inflect.number_to_words(m.group(0))
    return re.sub(r'\b\d+(\.\d+)?\b', _replace, text)

def normalize_text(text: str) -> str:
    lang = detect_language(text)
    if lang == "zh":
        # wetext handles Chinese number normalization
        from wetext import Normalizer
        normalizer = Normalizer(remove_erhua=False)
        return normalizer.normalize(text)
    else:
        return normalize_numbers_en(text)
```

### Budget-aware paragraph splitting
```python
from typing import List

# Punctuation that ends a sentence
_ZH_PUNCT = re.compile(r'[。！？；…]')
_EN_PUNCT = re.compile(r'[.!?;]')

def split_paragraph(
    text: str,
    token_max_n: int = 100,
    merge_len: int = 10,
) -> List[str]:
    """
    Split text into chunks, each under token_max_n tokens.
    Short sentences (< merge_len chars) are merged into the next chunk.
    """
    lang = detect_language(text)
    punct = _ZH_PUNCT if lang == "zh" else _EN_PUNCT

    # Split on sentence-ending punctuation, keeping the delimiter
    raw_sentences = [s.strip() for s in punct.split(text) if s.strip()]

    chunks = []
    current = ""

    for sentence in raw_sentences:
        # For CJK: use char count as proxy for tokens
        # For EN: use word count as proxy
        if lang == "zh":
            sentence_len = len(sentence)
            current_len = len(current)
        else:
            sentence_len = len(sentence.split())
            current_len = len(current.split())

        if current_len + sentence_len > token_max_n and current:
            if current_len >= merge_len:
                chunks.append(current)
                current = sentence
            else:
                # Merge short tail into next sentence
                current = current + " " + sentence if current else sentence
        else:
            current = current + " " + sentence if current else sentence

    if current:
        chunks.append(current)

    return [c.strip() for c in chunks if c.strip()]
```

### Full normalization pipeline
```python
def normalize_and_split(
    text: str,
    token_max_n: int = 100,
    merge_len: int = 10,
) -> List[str]:
    normalized = normalize_text(text)
    return split_paragraph(normalized, token_max_n=token_max_n, merge_len=merge_len)
```

## Source reference
- Upstream: `OpenBMB/VoxCPM` @ `main` / `13605c5a`
- Key files:
  - `src/voxcpm/utils/text_normalize.py:1-100` — full normalization + splitting implementation

## Notes
- `wetext` is a Chinese-specific library; install separately (`pip install wetext`). It handles numbers, dates, and abbreviations.
- CJK character count is a better token proxy than word count for Chinese — there are no spaces between words.
- Setting `merge_len` too low causes unnecessary chunk fragmentation; too high and you lose the benefit of merging short sentences.
