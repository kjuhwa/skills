---
version: 0.1.0-draft
name: playwright-stealth-cloudflare-bypass
summary: Playwright can bypass Cloudflare JS challenges by injecting init scripts that hide the `webdriver` property and fake `navigator.platform`/`navigator.vendor`; use `wait_for_timeout` instead of navigation timeout to capture download redirect URLs.
category: automation
tags: [playwright, cloudflare, stealth, automation, download-url, headless, browser]
source_type: extracted-from-git
source_url: https://github.com/aaddrick/claude-desktop-debian.git
source_ref: main
source_commit: 2fd9faf9db4eaa409b88310bdce397f8bdb0e916
source_project: claude-desktop-debian
imported_at: 2026-04-18T00:00:00Z
version_origin: extracted
confidence: medium
---

# Playwright Stealth for Cloudflare Bypass

## Context

Cloudflare's Bot Management (JS Challenge) runs JavaScript in the browser to
detect automation frameworks. Playwright in its default configuration exposes
several properties that Cloudflare checks: `navigator.webdriver === true`,
platform/vendor strings that match headless Chrome, and other fingerprint
signals. Cloudflare serves a challenge page instead of the real content when
these are detected.

This pattern is useful when automating download URL resolution for CI/CD
pipelines that need to follow redirect chains behind Cloudflare-protected pages.

## Observation

The `navigator.webdriver` property is the strongest automation signal.
Additionally, `navigator.platform` may be set to a headless-specific string
and `navigator.vendor` may be empty in default headless mode.

Separately, download redirect pages (e.g., `download.example.com/latest/redirect`)
are designed to immediately trigger a file download. Playwright's `page.goto()`
with `wait_until="networkidle"` or `"load"` will raise a timeout because the
page never actually loads HTML — it just emits an HTTP redirect or
`Content-Disposition: attachment` header. The navigation never "finishes" from
Playwright's perspective.

## Why it happens

`navigator.webdriver` is a W3C WebDriver spec requirement: automation-driven
browsers must set it to `true`. Cloudflare checks this and other browser
fingerprint properties to distinguish bots from humans.

Download pages trigger browser-level download handling, which Playwright's
network stack intercepts. The page navigation is considered "failed" or
"pending" by the page lifecycle because no document is loaded.

## Practical implication

**Stealth init script:**

```python
context.add_init_script("""
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    Object.defineProperty(navigator, 'platform',  { get: () => 'Linux x86_64' });
    Object.defineProperty(navigator, 'vendor',    { get: () => 'Google Inc.' });
""")
```

**Capturing download URL from a redirect page:**

```python
resolved_url = None

def handle_request(request):
    global resolved_url
    url = request.url
    # Intercept the final resolved URL (e.g., storage.googleapis.com .exe)
    if 'storage.googleapis.com' in url and url.endswith('.exe'):
        resolved_url = url

def handle_download(download):
    global resolved_url
    resolved_url = download.url

page.on('request', handle_request)
page.on('download', handle_download)

try:
    page.goto(redirect_url, timeout=30000, wait_until='commit')
    # wait_for_timeout is safer than goto timeout for download pages:
    # the navigation never "completes" — we just need a moment to capture
    # the URL from the request/download events.
    page.wait_for_timeout(2000)
except TimeoutError:
    pass  # Expected for redirect/download pages
except Exception as e:
    # "Download is starting" is an expected Playwright exception
    if 'Download is starting' not in str(e):
        raise
```

Use `wait_until='commit'` (fires when the first bytes are received and the
response is committed, before full page load) as the navigation condition,
then use `wait_for_timeout()` as a deliberate pause for event capture.

The browser context should set `accept_downloads=True` to enable the
`download` event handler.

## Source reference

- `scripts/resolve-download-url.py`: `resolve_download_url()` — complete
  production implementation with both `handle_request` and `handle_download`
  callbacks, stealth init script, and timeout-tolerant navigation.
