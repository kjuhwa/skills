---
name: androidmanifest-to-network-call-flow-tracing
description: Trace execution flows in a decompiled Android app from AndroidManifest entry points (Activities, Services, Receivers) through lifecycle hooks, click listeners, ViewModels/Repositories, and DI bindings, down to the final HTTP call — following the Android lifecycle chain to produce a complete UI-to-network map.
category: reverse-engineering
version: 1.0.0
tags: [android, reverse-engineering, call-flow, dagger, hilt, retrofit, lifecycle]
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

# AndroidManifest → Network Call Flow Tracing

A recipe for producing a complete call-flow map of a decompiled Android app, starting from the manifest and ending at HTTP requests. Works on both clear and obfuscated code because it anchors on framework surfaces (the manifest, Android lifecycle methods, DI annotations) that ProGuard/R8 cannot rename.

## The canonical chain

```
Activity.onCreate()
  → setContentView(R.layout.activity_main)
  → findViewById() / View Binding
  → button.setOnClickListener()
    → onClick()
      → viewModel.doSomething()
        → repository.fetchData()
          → apiService.getEndpoint()
            → HTTP request
```

Every hop in this chain is greppable. Work from both ends — top-down from the manifest and bottom-up from API annotations — and meet in the middle.

## Step 1: Manifest entry points

```bash
grep -n 'android:name=.*Activity' resources/AndroidManifest.xml
grep -n 'android:name=.*Service' resources/AndroidManifest.xml
grep -n '<receiver' resources/AndroidManifest.xml
grep -n '<provider' resources/AndroidManifest.xml
grep -A5 'MAIN' resources/AndroidManifest.xml | grep 'android:name'   # launcher
```

Activity/Service names in the manifest are never obfuscated — they must resolve at runtime.

## Step 2: Lifecycle + click handlers

```bash
grep -rn 'onCreate\|onResume\|onStart\|onViewCreated' sources/
grep -rn 'setOnClickListener\|onClick\|OnClickListener' sources/
grep -rn '@BindingAdapter\|android:onClick' sources/ resources/
grep -rn 'findNavController\|NavController\|navigate(' sources/
```

## Step 3: Application initialization

The `Application` subclass configures global singletons (HTTP clients, DI, base URL, analytics):

```bash
grep -rn 'extends Application\|: Application()' sources/
```

Read its `onCreate()` first — this tells you which HTTP client is in use and where the base URL is set.

## Step 4: DI bindings (Dagger / Hilt)

```bash
# Hilt
grep -rn '@Module\|@InstallIn\|@Provides\|@Binds' sources/
grep -rn '@HiltAndroidApp\|@AndroidEntryPoint\|@HiltViewModel' sources/

# Dagger
grep -rn '@Component\|@Subcomponent' sources/

# Everywhere
grep -rn '@Inject' sources/
```

To follow an interface through DI: find its `@Provides`/`@Binds`, then read the returned implementation.

## Step 5: Constants

```bash
grep -rni 'BASE_URL\|API_URL\|SERVER_URL\|HOST' sources/
grep -rni 'API_KEY\|CLIENT_ID\|APP_KEY\|SECRET' sources/
grep -rn 'BuildConfig\.' sources/
grep -rn 'getSharedPreferences\|getString(\|putString(' sources/
```

## Obfuscated code: anchor on string literals and framework classes

In obfuscated code, classes become `a`, `b`, `c`; methods become `a()`, `b()`. But these survive:

- **String literals** — URLs, error messages, log tags.
- **Android framework classes** — `Activity`, `Fragment`, `Intent`.
- **Library public APIs** — Retrofit annotations, OkHttp `Request.Builder`.
- **AndroidManifest entries** — Activity/Service names must be real.

### Concrete example (obfuscated login flow)

```
1. grep for "login" → find "auth/login" URL in class c.a.b.d
2. Class c.a.b.d has @POST("auth/login") → it's a Retrofit interface
3. grep for c.a.b.d usage → class c.a.b.f calls it (Repository)
4. grep for c.a.b.f usage → class c.a.a.g calls it (ViewModel)
5. grep for c.a.a.g usage → LoginActivity has a field of this type
6. Read LoginActivity.onCreate() → click listener → ViewModel method
```

Result: `LoginActivity → ViewModel → Repository → Retrofit @POST("auth/login")`

## Output

For each significant feature, produce one line showing the full chain: `<Activity or manifest entry> → <ViewModel/Presenter> → <Repository> → <API service>.<method>()`. Prioritize authentication and any feature the user specifically asked about.
