---
name: obfuscated-jvm-string-anchor-navigation
description: Navigate ProGuard/R8-obfuscated JVM bytecode by anchoring on artifacts that the obfuscator cannot rename — string literals, Android framework classes, library public APIs, and manifest entries — then walking outward through call-site greps to recover logical class names one hop at a time.
category: reverse-engineering
version: 1.0.0
tags: [android, reverse-engineering, obfuscation, proguard, r8, deobfuscation]
source_type: extracted-from-git
source_url: https://github.com/SimoneAvogadro/android-reverse-engineering-skill.git
source_ref: master
source_commit: ddeb9bc33272db1e34107fd286098bb1e9896e51
source_project: android-reverse-engineering-skill
source_path: plugins/android-reverse-engineering/skills/android-reverse-engineering/references/call-flow-analysis.md
imported_at: 2026-04-18T03:36:29Z
confidence: medium
version_origin: extracted
---

# Obfuscated JVM String-Anchor Navigation

ProGuard/R8 renames classes, methods, and fields but cannot touch identifiers required at runtime. Every obfuscated JAR/APK still ships with a rich set of **unobfuscated anchors** that you can grep for and use as entry points into the rename graph.

## What gets renamed

- Class names → `a`, `b`, `c`, `a$b`, …
- Method names → `a()`, `b()`, `c()`
- Field names → `f1234a`, `f1235b`

## What survives obfuscation

| Anchor | Why it survives |
|---|---|
| **String literals** (URLs, error messages, log tags) | Values, not names — obfuscators don't touch them |
| **Android framework classes** (`Activity`, `Fragment`, `Intent`) | Resolved by the Android runtime by fully-qualified name |
| **Library public APIs** (Retrofit `@GET`, OkHttp `Request.Builder`, Dagger `@Provides`) | Part of library ABIs; renaming breaks reflection/DI |
| **AndroidManifest entries** (Activity, Service, Receiver names) | Must match real class names at runtime |
| **Resource IDs** (`R.layout.*`, `R.string.*`) | Not part of the renamed bytecode graph |
| **Native method names** declared `native` | Must match JNI symbol names |
| **Serialization field names** (`@SerializedName`, Jackson `@JsonProperty`) | Consumed at runtime by the parser |

## The anchor-walk loop

```
1. Pick an anchor (a string, an annotation, a framework superclass).
2. grep for it across sources/.
3. Note the obfuscated class it lives in.
4. grep for usages of that class → find its callers.
5. Repeat until you hit something named (Activity, Fragment, Application, Service).
```

Each iteration recovers one logical boundary (service interface → repository → viewmodel → screen). The chain terminates at the manifest because manifest entries must use real class names.

## Practical starter anchors

- **Any URL** — `grep -rn '"https://' sources/` → lands on every API definition site.
- **Retrofit `@GET`/`@POST`** — one hit per endpoint; the enclosing interface is the API service even if its class name is `c.a.b.d`.
- **`extends Activity` / `extends Fragment`** — direct lookup of UI entry points.
- **`Retrofit.create(X.class)`** — the argument `X` is the service interface, confirming any Retrofit-annotated class.
- **Error/log strings** — `Log.e(TAG, "Login failed: …")` uniquely identifies a feature area.

## When `--deobf` or mapping files are available

- `jadx --deobf` synthesizes readable replacement names and writes `deobf-mapping.txt`. Helpful, but the names are guessed — still verify via the anchors above.
- A shipped ProGuard `mapping.txt` (occasionally in `assets/` or obtainable from build pipelines) is authoritative. Pass it to jadx:
  ```bash
  jadx --deobf-map mapping.txt -d output app.apk
  ```

## Why this beats pure static analysis

Running a decompiler alone gives you thousands of classes named `a.b.c.d`. Anchoring first gives you a handful of **true** names (URLs, annotation classes, manifest entries) that each point into the rename graph. Every subsequent grep shrinks the remaining unknown set — typical auth-flow trace resolves in 5–8 hops.

## Cross-reference tip

If `class a` calls `Retrofit.create(b.class)`, then `b` is a Retrofit service interface — a free renaming hint even when neither `a` nor `b` has any other identifying feature. Log these as you go; they compound.
