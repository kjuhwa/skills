---
name: dex2jar-bridge-apk-to-fernflower
description: Convert Android DEX bytecode to a standard JVM JAR with dex2jar so that Fernflower or Vineflower — which cannot read APK/DEX directly — can decompile it.
category: reverse-engineering
version: 1.0.0
tags: [dex2jar, fernflower, vineflower, dex, apk, android, reverse-engineering]
source_type: extracted-from-git
source_url: https://github.com/SimoneAvogadro/android-reverse-engineering-skill.git
source_ref: master
source_commit: ddeb9bc33272db1e34107fd286098bb1e9896e51
source_project: android-reverse-engineering-skill
source_path: plugins/android-reverse-engineering/skills/android-reverse-engineering/references/fernflower-usage.md
imported_at: 2026-04-18T03:31:43Z
confidence: medium
version_origin: extracted
---

# dex2jar bridge: APK → JAR → Fernflower

Fernflower / Vineflower only understand JVM bytecode (`.jar`, `.class`). Android ships Dalvik bytecode (`.dex`). `dex2jar` is the translator: it repackages the DEX entries inside an APK into a standard JAR that the JVM decompilers can consume.

## When to use

- You already have jadx output but want Fernflower's cleaner handling of specific classes.
- You want to run both decompilers (`--engine both`) for comparison on APK input.
- You're analyzing a DEX file directly (e.g. from `adb shell pm path` + `adb pull`).

Skip this skill for inputs that are already `.jar` or `.aar` — Fernflower reads those directly (AAR via its bundled `classes.jar`).

## Procedure

1. **Install dex2jar** (one-time): `brew install dex2jar` on macOS, or download the release bundle from https://github.com/pxb1988/dex2jar/releases and put it on `PATH`. Verify with `d2j-dex2jar --help`.

2. **Convert** the APK (or standalone DEX) to a JAR:

   ```bash
   d2j-dex2jar -f -o app-converted.jar app.apk
   ```

   Flags: `-f` force overwrite. `-o` sets the output path. dex2jar walks every `classes*.dex` inside the APK and merges them into the output JAR.

3. **Decompile** the resulting JAR with Fernflower/Vineflower:

   ```bash
   java -jar "$FERNFLOWER_JAR_PATH" -dgs=1 -mpm=60 app-converted.jar output/
   unzip -o output/app-converted.jar -d output/sources/
   ```

4. **(Optional) Target a single DEX** from a multi-dex APK:

   ```bash
   unzip app.apk 'classes*.dex' -d extracted/
   d2j-dex2jar -f -o classes2.jar extracted/classes2.dex
   ```

   This is faster when you only need to re-decompile one DEX that jadx mishandled.

## Counter / Caveats

- **ZipException during dex2jar**: the APK has a non-standard ZIP structure (sometimes signed in odd ways, or repackaged). Fall back to jadx, which tolerates more variants.
- dex2jar does not preserve Android resources; you still need jadx (or `apktool`) for AndroidManifest, layouts, drawables.
- For `.aar` files, skip dex2jar — extract the AAR and point Fernflower at the embedded `classes.jar`.
- The converted JAR contains JVM-legal bytecode but not necessarily semantically identical bytecode: some Dalvik-specific ops are translated heuristically. If a class behaves oddly in Fernflower output, double-check against jadx.

## References

- Upstream CLI wrapper: `scripts/decompile.sh` (automates `--engine fernflower` on APK input via this bridge)
- dex2jar releases: https://github.com/pxb1988/dex2jar/releases
