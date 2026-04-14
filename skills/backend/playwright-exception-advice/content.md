# PlaywrightException → structured HTTP error

## Problem

`PlaywrightException` is a single type covering dozens of browser failures — nav timeouts, cert errors, selector not found, target closed. A raw stack trace to the caller is useless ("Internal Server Error"); worse, swallowing it hides actionable hints like "your target is self-signed, set `ignoreHttpsErrors=true`".

## Pattern

Put a dedicated `@ControllerAdvice` handler that (a) logs the full cause, (b) returns a small JSON body with `type` + `message`, and (c) pattern-matches known substrings to attach a `suggestion`.

```java
@ControllerAdvice
public class GlobalExceptionHandler {
  private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

  @ExceptionHandler(PlaywrightException.class)
  public ResponseEntity<Map<String,Object>> handle(PlaywrightException e) {
    log.error("Playwright error: {}", e.getMessage(), e);
    Map<String,Object> body = new HashMap<>();
    body.put("type", "PLAYWRIGHT_EXCEPTION");
    body.put("message", e.getMessage());

    String msg = e.getMessage() == null ? "" : e.getMessage();
    if (msg.contains("ERR_CERT_AUTHORITY_INVALID")) {
      body.put("suggestion", "Try setting ignoreHttpsErrors=true");
      body.put("certificate_error", true);
    } else if (msg.contains("Timeout") && msg.contains("exceeded")) {
      body.put("suggestion", "Increase wait/delayMs or change wait to 'domcontentloaded'");
    }
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body);
  }
}
```

Pair it with a generic `Exception` handler so untyped failures still produce clean JSON (not the Spring default HTML page).

## When to use

- Any REST API that wraps Playwright/Puppeteer/any library whose exceptions mostly bundle remote-system text into a single class.
- When you want to translate infrastructure failures into user-fixable advice without exposing stack traces.

## Pitfalls

- **Don't leak the raw message blindly.** Playwright's messages sometimes include file paths from the server. Strip or whitelist before returning.
- **String matching is brittle.** `ERR_CERT_AUTHORITY_INVALID` is stable across Playwright versions but timeout wording isn't — log the raw message and tune the substrings over time.
- **Order matters.** A `@ExceptionHandler(Exception.class)` in the same advice will catch `PlaywrightException` first if it comes before the specific handler. Spring resolves by closest supertype, but keep the specific one visible at the top.
- **Don't return `200 OK` on failure** just because you formatted the body nicely — keep the 5xx so callers retry/alert correctly.
- **Rate-limit the error logger.** Playwright failures often come in bursts when a target site is down; an unbounded `log.error` floods storage.
