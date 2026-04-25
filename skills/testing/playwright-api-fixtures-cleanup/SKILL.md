---
name: playwright-api-fixtures-cleanup
description: Self-contained Playwright E2E tests using a TestApiClient fixture that creates entities over HTTP and tears them down in afterEach — no shared DB seed, no cross-test pollution.
category: testing
version: 1.0.0
tags: [playwright, e2e, fixtures, testing, cleanup]
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

- Multi-user / multi-tenant app with an HTTP API.
- You want E2E tests to run against a real backend, in parallel, without step-on-toes failures.
- You're tired of `beforeAll` migration/seed scripts that get out of sync with app behavior.

## Steps

1. Build a `TestApiClient` class that:
   - Logs in as a fixed test user (dev verification code in non-prod).
   - Tracks every entity it creates (issues, workspaces, comments).
   - Exposes `cleanup()` to delete them all.
   ```ts
   export class TestApiClient {
     private token: string | null = null;
     private createdIssues: string[] = [];
     async login(email: string, name: string) {
       await fetch(`${API}/auth/send-code`, { method: "POST", body: JSON.stringify({ email }) });
       const r = await fetch(`${API}/auth/verify-code`, { method: "POST", body: JSON.stringify({ email, code: "888888" }) });
       this.token = (await r.json()).token;
     }
     async createIssue(title: string): Promise<Issue> {
       const r = await fetch(`${API}/api/issues`, { method: "POST", headers: { Authorization: `Bearer ${this.token}` }, body: JSON.stringify({ title }) });
       const issue = await r.json();
       this.createdIssues.push(issue.id);
       return issue;
     }
     async cleanup() {
       for (const id of this.createdIssues) {
         await fetch(`${API}/api/issues/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${this.token}` } });
       }
     }
     getToken() { return this.token!; }
   }
   ```
2. Expose helpers that combine login + workspace scaffolding:
   ```ts
   export async function loginAsDefault(page: Page): Promise<string> {
     const api = new TestApiClient();
     await api.login(E2E_EMAIL, E2E_NAME);
     const ws = await api.ensureWorkspace("E2E Workspace", "e2e-workspace");
     await page.goto("/login");
     await page.evaluate(t => localStorage.setItem("app_token", t), api.getToken());
     await page.goto(`/${ws.slug}/issues`);
     return ws.slug;
   }
   ```
3. Use in each spec:
   ```ts
   let api: TestApiClient;
   test.beforeEach(async ({ page }) => {
     api = await createTestApi();
     await loginAsDefault(page);
   });
   test.afterEach(() => api.cleanup());

   test("create and view issue", async ({ page }) => {
     const issue = await api.createIssue("Test Issue");
     await page.goto(`/issues/${issue.id}`);
     await expect(page.getByText("Test Issue")).toBeVisible();
   });
   ```

## Example

See the source repo's `e2e/helpers.ts` and `e2e/fixtures.ts`.

## Caveats

- `cleanup()` should tolerate already-deleted entities (404s from earlier cleanup paths or cascading deletes are fine).
- Don't share the `TestApiClient` across parallel tests — each gets its own via `beforeEach`.
- The dev-master verification code (e.g. `888888`) must only work in non-production builds; see the "verification-code-dev-master" knowledge entry.
