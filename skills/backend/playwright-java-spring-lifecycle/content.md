# Playwright (Java) lifecycle inside Spring Boot

## Problem

Playwright for Java exposes three scoped objects — `Playwright`, `Browser`, and `BrowserContext` — with very different costs:

- `Playwright.create()` spawns a Node driver subprocess (hundreds of ms).
- `Browser` is an expensive, reusable singleton.
- `BrowserContext` is cheap and should be per-request so cookies/storage don't leak between callers.

Creating these per request kills throughput; sharing a `BrowserContext` across requests leaks state and breaks concurrent users.

## Pattern

One Spring `@Component` owns `Playwright` and `Browser` for the app's lifetime and hands out a fresh `BrowserContext` per caller.

```java
@Component
public class BrowserManager {
  private Playwright playwright;
  private Browser browser;

  @Value("${playwright.headless:true}") private boolean headless;

  @PostConstruct
  void init() {
    playwright = Playwright.create();
    BrowserType.LaunchOptions opts = new BrowserType.LaunchOptions()
        .setHeadless(headless)
        .setArgs(List.of("--no-sandbox", "--disable-dev-shm-usage"));
    browser = playwright.chromium().launch(opts);
  }

  public BrowserContext newContext(Integer width, Integer height,
                                   Double dpr, String userAgent) {
    Browser.NewContextOptions opt = new Browser.NewContextOptions()
        .setViewportSize(width != null ? width : 1280,
                         height != null ? height : 800)
        .setDeviceScaleFactor(dpr != null ? dpr : 1.0)
        .setIgnoreHTTPSErrors(true);
    if (userAgent != null && !userAgent.isBlank()) opt.setUserAgent(userAgent);
    return browser.newContext(opt);
  }

  @PreDestroy
  void shutdown() {
    if (browser != null) browser.close();
    if (playwright != null) playwright.close();
  }
}
```

Callers consume contexts with try-with-resources so nothing leaks on exceptions:

```java
try (BrowserContext ctx = manager.newContext(w, h, dpr, ua);
     Page page = ctx.newPage()) {
    page.navigate(url);
    return page.screenshot();
}
```

## When to use

- Any Spring/Java service that serves screenshots, PDFs, or scrapes on demand.
- Any Java backend that needs Playwright-driven automation at request scale.

## Pitfalls

- **Don't make `BrowserContext` a singleton.** Cookies, auth, and local storage leak across users.
- **Docker needs container-safe Chromium flags** — `--no-sandbox` and `--disable-dev-shm-usage` are nearly mandatory inside containers; without them Chromium crashes on small `/dev/shm`.
- **Closing order.** Close `Page` → `Context` → `Browser` → `Playwright`. Try-with-resources on `ctx` + `page` handles the request scope; `@PreDestroy` handles the app scope.
- **Inspector/headful mode needs a different branch.** Launching with `PWDEBUG=1` plus `setHeadless(false)` and a longer default timeout is a separate code path — don't mix it into the hot path.
- **Playwright's Java driver isn't designed to be recreated per call.** Keep the `Playwright` + `Browser` pair alive for the whole JVM.
