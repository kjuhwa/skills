---
name: jwt-extraction-via-base-controller
description: Consolidate repeated `JwtTokenService.getXxxFromBearerToken(headerAuthorization)` calls across Spring controllers by moving the service and helper methods onto a shared `BaseController`. Subclass controllers call `getOrganizationId(h)` / `getLoginId(h)` / `getRoleIds(h)` directly.
category: backend
tags: [spring-boot, jwt, controller, refactor, base-class]
triggers:
  - "jwt extraction controller duplication"
  - "base controller jwt"
  - "getXxxFromBearerToken 중복 제거"
scope: user
version: 1.0.0
---

# JWT Claim Extraction via BaseController

Put `JwtTokenService` + protected helper methods (`getOrganizationId`, `getLoginId`, `getRoleIds`) on a shared `BaseController`. Concrete controllers extend and call helpers directly, eliminating per-controller field declarations and reducing `Authorization` header handling to one line per use.

## When to use
- Multiple Spring controllers share the same bearer-token claim extraction.
- You don't yet need a full `@AuthenticationPrincipal` / `HandlerMethodArgumentResolver` layer.
- Refactor target: repeated `jwtTokenService.getXxxFromBearerToken(headerAuthorization)` calls.

## Steps
1. Introduce or reuse `abstract class BaseController`.
2. Add `@Autowired protected JwtTokenService jwtTokenService;` — `protected` is intentional so subclasses see it directly while DI still works.
3. Add helpers:
   ```java
   protected String getOrganizationId(String h) { return jwtTokenService.getOrganizationIdFromBearerToken(h); }
   protected String getLoginId(String h)        { return jwtTokenService.getLoginIdFromBearerToken(h); }
   protected List<String> getRoleIds(String h)  { return jwtTokenService.getRoleIdsFromBearerToken(h); }
   ```
4. Subclass controllers: remove `private final JwtTokenService jwtTokenService`, drop its import, replace calls with the helpers.
5. Skip for controllers that don't consume JWT (file upload, dev-only token minting).

## Counter / Caveats
- Prefer `HandlerMethodArgumentResolver` + `@AuthPrincipal` if you have many controllers or need strong test isolation.
- Inheritance-based sharing couples controllers to `BaseController`; keep `BaseController` thin (exception handling + these helpers only).
