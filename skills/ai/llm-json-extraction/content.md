# LLM JSON Extraction

## Problem
LLMs that are asked to return JSON often wrap it in markdown fences (```json ... ```), prepend explanations ("Here's the JSON..."), or append trailing notes. Naive `JSON.parse(text)` / `objectMapper.readValue(text, Map.class)` fails even when the model complied "mostly."

Telling the model "respond with pure JSON only" reduces but does not eliminate this — you still need a defensive extractor on the client side.

## Pattern

Three-step sanitizer, applied in order:

1. **Trim** surrounding whitespace.
2. **Strip fences** if the string starts with triple backticks: remove the opening fence (```lang` or ``` ``` `) and the closing fence.
3. **Bracket-slice**: find the first `{` and last `}` (or `[` / `]` for arrays) and keep only that substring.

Step 3 is the key insight: it survives both leading prose ("Here is your result: {...}") and trailing prose ("... this was generated at ..."), and does not require a real JSON parser pre-pass.

## Example (Java)

```java
private String extractJson(String text) {
    text = text.strip();
    if (text.startsWith("```")) {
        text = text.replaceFirst("```[a-zA-Z]*\\s*", "");
        text = text.replaceFirst("\\s*```\\s*$", "");
        text = text.strip();
    }
    int start = text.indexOf('{');
    int end = text.lastIndexOf('}');
    if (start >= 0 && end > start) {
        text = text.substring(start, end + 1);
    }
    return text;
}
```

For arrays, swap the brace characters. For either-object-or-array, take the earlier of `{` / `[` as start and the later of the matching closer as end.

## When to use

- Any client that calls a chat-completion / text-generation API and expects structured JSON back.
- CLI wrappers piping LLM output (e.g., `claude -p ... --output-format text`) into a downstream parser.
- Test harnesses that assert on the shape of model output.

## Pitfalls

- **Nested code fences**: a JSON value that itself contains a markdown-fenced string will confuse a regex that greedily matches fences. The patterns above use `replaceFirst` at start and end only, which is safe for the common case.
- **Unbalanced braces inside strings**: the "first `{`, last `}`" heuristic can miscount if the model emits malformed JSON with a stray `}` inside a string. At that point the model broke its contract — surface a parse error rather than silently truncating.
- **Control characters**: LLMs sometimes emit literal newlines inside JSON string values. In Jackson, enable `JsonReadFeature.ALLOW_UNESCAPED_CONTROL_CHARS` on the `ObjectMapper` to avoid parse failures on otherwise-correct output.
- **Trust boundary**: the extractor should not evaluate or unescape the content — it only carves out the JSON substring. Let the real JSON parser do validation.
