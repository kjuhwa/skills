---
version: 0.1.0-draft
name: annotation-driven-authz-via-function-id
title: Annotation-driven coarse-grained authorization via @FunctionId
description: Controllers declare required capability with a method-level enum annotation; an interceptor enforces it against JWT-derived roles
type: knowledge
category: arch
confidence: high
source:
  kind: project
  ref: lucida-topology@8729ca3
tags: [authorization, jwt, annotation, interceptor, rbac]
---

# Annotation-driven coarse-grained authorization via `@FunctionId`

## Fact
Authorization is expressed at the controller method level with a custom annotation
(`@FunctionId(ApiFunctionId.VIEW | INSERT | DELETE | COPY | UPLOAD | DOWNLOAD | TAG_ROLE)`). A
JWT-validating interceptor from the shared library (`TWebJwtTokenInterceptor`) reads the
annotation, resolves the caller's roles from the token, and permits or rejects the call. The
controller itself contains no `if (role == …)` branches.

## Shape
- One enum per bounded context lists every *capability* the service exposes (verbs, not roles).
- Each controller method is annotated with exactly one capability.
- The mapping of role → allowed capabilities lives in shared auth infra, not the service.
- Fine-grained filtering (row-level "which maps can this user see?") is done by passing the
  token's `roleIdList` down to the repository as a query predicate, not by filtering post-query.

## Why chosen
- Capabilities are a stable vocabulary; role membership churns. Decoupling them means role
  changes require no redeploy of services.
- Annotation + interceptor puts the check on the request path unconditionally — harder to forget
  than an inline `authService.check(...)` call.

## Counter / Caveats
- A missing `@FunctionId` on a new endpoint is fail-open unless the interceptor defaults to
  deny. Make "no annotation ⇒ reject" the default.
- Enum-based capabilities don't compose (e.g. `VIEW && OWN_TENANT`). Combine with tenant scoping
  (see `tenant-context-per-request-interceptor`) for the second axis.
- Row-level filtering via `roleIdList` in the query leaks authorization into DAO code. Accept
  this as a pragmatic trade-off for Mongo (no DB-level RLS), but keep the filter centralized in
  a single query builder helper.

## Evidence
- `CLAUDE.md` — "Authorization" section.
- `src/main/java/com/nkia/lucida/topology/controller/` — `@FunctionId(ApiFunctionId.*)` on most
  public endpoints.
