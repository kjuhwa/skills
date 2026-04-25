---
name: e2e-default-login-helper
description: Reusable Playwright loginAsDefault helper that authenticates via API (send-code + verify-code), injects the token into localStorage, and navigates to a workspace-scoped URL.
category: testing
version: 1.0.0
tags: [playwright, e2e, auth, fixtures, testing]
source_type: extracted-from-git
source_url: https://github.com/multica-ai/multica.git
source_ref: main
source_commit: 6cd49e132de7632b1f2aaa675c98e8eca9308bb7
source_project: multica
imported_at: 2026-04-18T00:00:00Z
version_origin: extracted
confidence: high
---

## When to use

- Playwright E2E suite against a real backend + frontend in dev/staging.
- You have a stable test user and want to skip the browser login flow.

## Steps

1. Define constants for the default E2E user:
   ```ts
   const DEFAULT_E2E_NAME = "E2E User";
   const DEFAULT_E2E_EMAIL = "e2e@myapp.test";
   const DEFAULT_E2E_WORKSPACE = "e2e-workspace";
   ```
2. Helper that uses `TestApiClient` for the API calls, then injects the token into browser storage:
   ```ts
   export async function loginAsDefault(page: Page): Promise<string> {
     const api = new TestApiClient();
     await api.login(DEFAULT_E2E_EMAIL, DEFAULT_E2E_NAME);
     const workspace = await api.ensureWorkspace("E2E Workspace", DEFAULT_E2E_WORKSPACE);

     const token = api.getToken();
     await page.goto("/login");                    // start from a safe URL
     await page.evaluate((t) => {
       localStorage.setItem("myapp_token", t);
     }, token);
     await page.goto(`/${workspace.slug}/issues`);
     await page.waitForURL("**/issues", { timeout: 10000 });
     return workspace.slug;
   }
   ```
3. In test specs:
   ```ts
   let api: TestApiClient;
   test.beforeEach(async ({ page }) => {
     api = await createTestApi();
     await loginAsDefault(page);
   });
   test.afterEach(() => api.cleanup());
   ```

## Example

```ts
test("create and view an issue", async ({ page }) => {
  const issue = await api.createIssue("Test Issue");
  await page.goto(`/e2e-workspace/issues/${issue.id}`);
  await expect(page.getByText("Test Issue")).toBeVisible();
});
```

## Caveats

- `loginAsDefault` starts with `page.goto("/login")` before writing to localStorage. Without that, `page.evaluate` may run on `about:blank` where localStorage writes don't persist.
- Tests that exercise the login flow itself shouldn't use this helper — they need to go through the UI. Name them `*-login.spec.ts` and opt out.
- If the storage key or token format changes, update the helper first; Playwright tests will surface the breakage fast but the fix is in one place.
