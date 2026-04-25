---
name: retrofit-okhttp-api-endpoint-extraction
description: Enumerate and document all HTTP endpoints from decompiled Android code by grepping annotation/builder signatures (Retrofit @GET/@POST, OkHttp Request.Builder, Volley request classes) then capturing method, path, headers, body, response type, and call site for each hit.
category: reverse-engineering
version: 1.0.0
tags: [android, reverse-engineering, retrofit, okhttp, volley, api-extraction, http]
source_type: extracted-from-git
source_url: https://github.com/SimoneAvogadro/android-reverse-engineering-skill.git
source_ref: master
source_commit: ddeb9bc33272db1e34107fd286098bb1e9896e51
source_project: android-reverse-engineering-skill
source_path: plugins/android-reverse-engineering/skills/android-reverse-engineering/references/api-extraction-patterns.md
imported_at: 2026-04-18T03:36:29Z
confidence: medium
version_origin: extracted
---

# Retrofit / OkHttp / Volley API Endpoint Extraction

After decompiling an Android app, enumerate every HTTP endpoint it calls by running a fixed set of grep patterns against the `sources/` tree. The patterns target the **public library API surface**, which survives obfuscation — annotation names and Retrofit/OkHttp method calls are never renamed by ProGuard/R8.

## Search strategy (ordered)

1. **Base URL constants** — find where the API root is configured before anything else. It anchors every subsequent endpoint.
2. **Retrofit interfaces** — cleanest enumeration; one annotated method per endpoint.
3. **Interceptors** — reveal auth headers and common request modifiers.
4. **Hardcoded URLs** — catch one-off calls outside the main client.
5. **WebView URLs** — some hybrid apps route API calls through JavaScript bridges.

## Retrofit patterns

```bash
# HTTP method annotations
grep -rn '@GET\|@POST\|@PUT\|@DELETE\|@PATCH\|@HEAD' sources/

# Parameter annotations
grep -rn '@Query\|@QueryMap\|@Path\|@Body\|@Field\|@FieldMap\|@Part\|@Header\|@HeaderMap' sources/

# Static headers + base URL
grep -rn '@Headers' sources/
grep -rn 'baseUrl\|\.baseUrl(' sources/
```

## OkHttp patterns

```bash
grep -rn 'Request\.Builder\|Request.Builder\|\.url(\|\.post(\|\.put(\|\.delete(\|\.patch(' sources/
grep -rn 'HttpUrl\|\.addQueryParameter\|\.addPathSegment' sources/
grep -rn 'Interceptor\|addInterceptor\|addNetworkInterceptor\|intercept(' sources/
grep -rn '\.execute()\|\.enqueue(' sources/
```

## Volley / HttpURLConnection / WebView

```bash
grep -rn 'StringRequest\|JsonObjectRequest\|JsonArrayRequest\|Volley\.newRequestQueue\|RequestQueue' sources/
grep -rn 'HttpURLConnection\|HttpsURLConnection\|openConnection\|setRequestMethod\|setRequestProperty' sources/
grep -rn 'loadUrl\|evaluateJavascript\|addJavascriptInterface\|WebViewClient\|shouldOverrideUrlLoading' sources/
```

## Hardcoded URL + secret sweep

```bash
grep -rn '"https\?://[^"]*"' sources/
grep -rni 'api[_-]\?key\|api[_-]\?secret\|auth[_-]\?token\|bearer\|access[_-]\?token\|client[_-]\?secret' sources/
grep -rni 'BASE_URL\|API_URL\|SERVER_URL\|ENDPOINT\|API_BASE' sources/
```

## Endpoint documentation template

For every hit that resolves to a real endpoint, write one block:

```markdown
### `METHOD /path/to/endpoint`

- **Source**: `com.example.api.ApiService` (ApiService.java:42)
- **Base URL**: `https://api.example.com/v1`
- **Full URL**: `https://api.example.com/v1/path/to/endpoint`
- **Path params**: `id` (String)
- **Query params**: `page` (int), `limit` (int)
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Request body**: `LoginRequest { email: String, password: String }`
- **Response**: `ApiResponse<User>`
- **Called from**: `LoginActivity → LoginViewModel → UserRepository → ApiService`
```

The "Called from" field is the payoff — it connects the endpoint back to user-facing UI and reveals the full request path.

## Why this pattern survives obfuscation

Retrofit annotations (`@GET`, `@POST`, `@Path`, etc.) are part of the library's public ABI. ProGuard/R8 cannot rename them without breaking the Retrofit runtime's reflection lookups. String literals (URLs, header names) are also preserved. So even in a fully obfuscated app with single-letter class names, the annotation grep still lands on every endpoint — you just have to trace the anchor class back through obfuscated callers.
