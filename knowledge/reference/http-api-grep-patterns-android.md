---
version: 0.1.0-draft
name: http-api-grep-patterns-android
summary: Copy-paste grep patterns for locating HTTP endpoints in decompiled Android source — Retrofit annotations, OkHttp Request.Builder, Volley request classes, HttpURLConnection, WebView loadUrl, hardcoded URLs, and API-key/secret sweeps.
category: reference
confidence: medium
tags: [android, reverse-engineering, retrofit, okhttp, volley, grep, http, reference]
source_type: extracted-from-git
source_url: https://github.com/SimoneAvogadro/android-reverse-engineering-skill.git
source_ref: master
source_commit: ddeb9bc33272db1e34107fd286098bb1e9896e51
source_project: android-reverse-engineering-skill
source_path: plugins/android-reverse-engineering/skills/android-reverse-engineering/references/api-extraction-patterns.md
imported_at: 2026-04-18T03:36:29Z
linked_skills: [retrofit-okhttp-api-endpoint-extraction, androidmanifest-to-network-call-flow-tracing]
---

# HTTP API Grep Patterns (Android)

Copy-paste patterns for finding HTTP call sites in a decompiled Android `sources/` tree. These work on obfuscated code because library annotation names and HTTP method literals are never renamed by ProGuard/R8.

## Retrofit

```bash
# HTTP methods
grep -rn '@GET\|@POST\|@PUT\|@DELETE\|@PATCH\|@HEAD' sources/

# Parameters
grep -rn '@Query\|@QueryMap\|@Path\|@Body\|@Field\|@FieldMap\|@Part\|@Header\|@HeaderMap' sources/

# Static headers + base URL config
grep -rn '@Headers' sources/
grep -rn 'baseUrl\|\.baseUrl(' sources/
```

Typical Retrofit interface:

```java
public interface ApiService {
    @GET("users/{id}")
    Call<User> getUser(@Path("id") String userId);

    @POST("auth/login")
    @Headers({"Content-Type: application/json"})
    Call<LoginResponse> login(@Body LoginRequest request);
}
```

## OkHttp

```bash
grep -rn 'Request\.Builder\|Request.Builder\|\.url(\|\.post(\|\.put(\|\.delete(\|\.patch(' sources/
grep -rn 'HttpUrl\|\.addQueryParameter\|\.addPathSegment' sources/
grep -rn 'Interceptor\|addInterceptor\|addNetworkInterceptor\|intercept(' sources/
grep -rn '\.execute()\|\.enqueue(' sources/
```

## Volley

```bash
grep -rn 'StringRequest\|JsonObjectRequest\|JsonArrayRequest\|Volley\.newRequestQueue\|RequestQueue' sources/
```

Volley requests typically pass the URL in a constructor argument and override `getHeaders()` / `getParams()` for custom headers and form parameters.

## HttpURLConnection (legacy)

```bash
grep -rn 'HttpURLConnection\|HttpsURLConnection\|openConnection\|setRequestMethod\|setRequestProperty' sources/
```

## WebView

```bash
grep -rn 'loadUrl\|evaluateJavascript\|addJavascriptInterface\|WebViewClient\|shouldOverrideUrlLoading' sources/
```

Hybrid apps may route API calls through JavaScript bridges — look for `@JavascriptInterface` methods for the bridge surface.

## Hardcoded URLs and secrets

```bash
# Raw URLs
grep -rn '"https\?://[^"]*"' sources/

# API keys, tokens
grep -rni 'api[_-]\?key\|api[_-]\?secret\|auth[_-]\?token\|bearer\|access[_-]\?token\|client[_-]\?secret' sources/

# Constants
grep -rni 'BASE_URL\|API_URL\|SERVER_URL\|ENDPOINT\|API_BASE' sources/
```

## Recommended search order

1. **Base URL constants** — anchor; tells you what host every subsequent hit belongs to.
2. **Retrofit interfaces** — cleanest endpoint enumeration.
3. **Interceptors** — reveal auth schemes and common headers.
4. **Hardcoded URLs** — catch one-off calls outside the main client.
5. **WebView URLs** — catch hybrid/JS-bridge endpoints.

## Why these patterns survive obfuscation

- **Annotation class names** (`@GET`, `@Body`, `@Query`) are part of the library's public ABI — ProGuard/R8 cannot rename them without breaking runtime reflection.
- **String literals** (URLs, header values, path templates) are never renamed — values are data, not identifiers.
- **Library method chains** (`Request.Builder().url().build()`) map to public library classes that must keep their real names for the library to function.
