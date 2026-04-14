# Playwright Inspector / codegen from a Java app

## Problem

When a Playwright script fails only in the running service (cert quirks, auth cookies, custom viewport), you need to step through it with the Inspector or record selectors with `codegen` — but both normally run from a separate CLI, not from the deployed app.

## Pattern

**1. Enable Inspector for an in-process run** by setting `PWDEBUG` *before* `Playwright.create()`. The env vars have no effect once the driver subprocess is spawned.

```java
@PostConstruct
void init() {
  if (inspectorEnabled) {
    System.setProperty("PWDEBUG", "1");
    System.setProperty("PWDEBUG_HEADLESS", "false");
  }
  playwright = Playwright.create();

  BrowserType.LaunchOptions opts = new BrowserType.LaunchOptions()
      .setHeadless(!inspectorEnabled);   // inspector requires headful
  browser = playwright.chromium().launch(opts);
}
```

For the request path, raise timeouts so the developer can actually interact:

```java
BrowserContext ctx = browser.newContext(opt);
ctx.setDefaultTimeout(60_000);
ctx.setDefaultNavigationTimeout(60_000);
```

**2. Offer `codegen` as a one-liner** the user runs from the project root — Playwright's CLI is already on the classpath:

```bash
mvn exec:java \
  -Dexec.mainClass=com.microsoft.playwright.CLI \
  -Dexec.args="codegen --viewport-size=1280,800 https://example.com"
```

An endpoint that *returns* that command (with the user's URL/viewport filled in) is often friendlier than making users memorize it.

## When to use

- A backend service that runs Playwright scripts and needs interactive debugging against real request conditions (cookies, certs, proxies).
- Teams where non-Java developers need to record selectors against the app's browser profile.

## Pitfalls

- **`PWDEBUG` must be set before `Playwright.create()`.** Setting it later does nothing — the driver already read its env.
- **Inspector mode is not headless.** Don't enable it in prod; gate it with a config flag (e.g., `playwright.inspector=true`).
- **Don't use try-with-resources for the Inspector context.** If the context closes while the user is still clicking, the browser window dies. Use manual `try/finally` with a long `waitForTimeout` or a keep-alive signal.
- **`codegen` opens its own browser**, not your app's `Browser`. Selectors it records are still valid, but cookies/auth from the running service won't carry over unless you pass `--load-storage` / `--save-storage`.
- **Container deployments rarely have a display.** Inspector needs X11/VNC or a remote debug bridge — document this as "local-dev only" unless you add a VNC sidecar.
