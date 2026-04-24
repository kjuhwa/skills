---
name: android-apk-multi-engine-decompilation
description: Decompile APK/XAPK/JAR/AAR with two complementary engines (jadx + Fernflower/Vineflower) and compare outputs per-class to maximize readability — jadx for broad APK coverage with resources, Fernflower for higher-fidelity Java on lambdas/generics/streams.
category: reverse-engineering
version: 1.0.0
tags: [android, reverse-engineering, decompilation, jadx, fernflower, vineflower, apk]
source_type: extracted-from-git
source_url: https://github.com/SimoneAvogadro/android-reverse-engineering-skill.git
source_ref: master
source_commit: ddeb9bc33272db1e34107fd286098bb1e9896e51
source_project: android-reverse-engineering-skill
source_path: plugins/android-reverse-engineering/skills/android-reverse-engineering/SKILL.md
imported_at: 2026-04-18T03:36:29Z
confidence: medium
version_origin: extracted
---

# Android APK Multi-Engine Decompilation

A decompilation workflow that runs **both** jadx and Fernflower/Vineflower on the same input, then uses per-class comparison to pick the higher-quality output. Neither engine dominates in every scenario — jadx is fast and handles APK resources natively, Fernflower produces cleaner Java for lambdas, generics, and streams. Running them together eliminates the guess-work.

## When to use

- You have an APK/XAPK/JAR/AAR and need the most readable Java source you can get.
- First-pass decompilation produced `// Error` stubs or warning-flagged classes.
- The target app ships obfuscated bytecode (ProGuard/R8) and you want every anchor you can get.

## Engine selection matrix

| Situation | Engine |
|---|---|
| First pass on any APK | `jadx` (fastest, handles resources) |
| JAR/AAR library analysis | `fernflower` (better Java output) |
| jadx output has warnings/broken code | `both` (compare and pick best per class) |
| Complex lambdas, generics, streams | `fernflower` |
| Quick overview of a large APK | `jadx --no-res` |

With `--engine both`, outputs land in `<output>/jadx/` and `<output>/fernflower/`. After the run, produce a comparison summary (file counts + jadx warning counts) and review the warning-flagged classes in the Fernflower tree.

## Pipeline requirements

- **Java 17+** (required by jadx).
- **jadx** on PATH.
- **Fernflower/Vineflower** (Vineflower preferred — same CLI, actively maintained).
- **dex2jar** (required for Fernflower on APK/DEX input — Fernflower only reads JVM bytecode).

For APK → Fernflower: the pipeline is `dex2jar → JAR → fernflower → source JAR → unzip`. Automate this — manual chaining is error-prone.

## XAPK handling

XAPK is a ZIP bundle containing base + split APKs (APKPure and similar stores use it). The wrapper must:

1. Extract the outer ZIP.
2. Enumerate every `*.apk` inside.
3. Decompile each into its own subdirectory.
4. Copy the XAPK manifest to the output root for reference.

Never decompile an XAPK as a single blob — the inner APKs are independent and split by ABI/density.

## Obfuscation

For obfuscated apps, pass `--deobf` to jadx to produce readable replacement names (mapping written to `deobf-mapping.txt`). If a ProGuard mapping ships in the APK (`assets/`) or is otherwise available, prefer it over synthesized names:

```bash
jadx --deobf-map mapping.txt -d output app.apk
```

## Why two engines

Neither jadx nor Fernflower is strictly better. jadx wins on resource decoding and Android-specific constructs; Fernflower wins on modern Java (records, sealed classes, switch expressions, lambdas). The `--engine both` mode costs 2× time for a far-higher-quality composite output — cheap when the target is a single APK you'll spend hours analyzing.
