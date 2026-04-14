# AI Call with Mock Fallback

## Problem
LLM / image-generation calls fail for many mundane reasons: missing API key, CLI not installed, network blip, malformed JSON in the response, rate limit. If the server propagates the failure as HTTP 500, the client has to re-implement "what should I show when AI is down?" in every caller.

Worse, early-stage projects often have *no* configured AI backend yet — the team still wants the UI to render realistic data.

## Pattern

Wrap the AI call in try/catch. On failure, return a **deterministic mock response with the same shape**, plus two marker fields:

- `mock: true` (boolean flag — client uses this to show a badge).
- `error: "<short reason>"` (string — optional; useful for dev, safe to omit in prod).

The endpoint therefore never returns 5xx for an AI failure; it returns 200 with a degraded-but-valid payload. The UI layer can decide whether to show "Mock data (API key missing)" or just render.

## Example (Java / Spring)

```java
public Map<String, Object> generate(String story) {
    Map<String, Object> result;
    try {
        result = generateWithClaude(story);          // real AI path
    } catch (Exception e) {
        result = generateMock(story);                 // same-shape fallback
        result.put("error", "AI failed, using mock: " + e.getMessage());
    }
    return result;
}

private Map<String, Object> generateMock(String story) {
    // Hand-written fixtures matching the real response shape.
    Map<String, Object> result = new LinkedHashMap<>();
    result.put("title", story);
    result.put("panels", List.of(/* ... */));
    result.put("mock", true);   // always true in fallback
    return result;
}
```

And on the client:

```tsx
{result.mock && (
  <Text style={styles.mockBadge}>Mock data (API key not set)</Text>
)}
```

## When to use

- Demos, side projects, or pre-launch products where the AI backend is not guaranteed to be wired up.
- Development environments where contributors don't all have API keys.
- Public-facing apps where you prefer graceful degradation over an error screen during transient outages.

## Pitfalls

- **Shape drift**: the mock must stay in sync with the real schema. Add a schema test that validates both real and mock payloads against the same JSON schema / Zod / Pydantic model.
- **Silent bugs in production**: if `mock: true` ships to prod users without a visible badge, you may never notice that your AI path has been broken for weeks. The badge is load-bearing.
- **Do not fall back on authentication / authorization failures** — those should surface as 401/403, not as mock content.
- **Costs**: if the mock branch is cheap and the real call is expensive, a bug that routes all traffic into the mock can hide behind "everything still works." Add a metric that counts `mock: true` responses and alert when the ratio exceeds a threshold.
- **Security**: do not include raw exception messages (`e.getMessage()`) in the response in production — they can leak paths, stack trace fragments, or internal hostnames. Gate that on a dev profile.
