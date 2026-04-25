---
version: 0.1.0-draft
name: dex2jar-apk-to-jar-intermediate-conversion
summary: dex2jar (`d2j-dex2jar`) converts Android DEX bytecode to standard Java JAR so that JVM-only decompilers (Fernflower/Vineflower, CFR, Procyon) can process APK content that they cannot read natively.
category: reference
confidence: medium
tags: [android, dex2jar, dex, apk, jvm, bytecode, conversion, reverse-engineering, reference]
source_type: extracted-from-git
source_url: https://github.com/SimoneAvogadro/android-reverse-engineering-skill.git
source_ref: master
source_commit: ddeb9bc33272db1e34107fd286098bb1e9896e51
source_project: android-reverse-engineering-skill
source_path: plugins/android-reverse-engineering/skills/android-reverse-engineering/references/setup-guide.md
imported_at: 2026-04-18T03:36:29Z
linked_skills: [android-apk-multi-engine-decompilation]
---

# dex2jar APK→JAR Intermediate Conversion

## Purpose

Android ships bytecode as DEX (Dalvik Executable), not standard JVM class files. Most Java decompilers (Fernflower, Vineflower, CFR, Procyon) only read JVM bytecode. dex2jar bridges the gap by converting DEX → JAR of standard `.class` files, enabling any JVM decompiler to process Android content.

jadx is the exception — it reads DEX directly and doesn't need this step.

## Install

### GitHub Releases

```bash
# Download latest from https://github.com/pxb1988/dex2jar/releases/latest
unzip dex-tools-*.zip -d ~/dex2jar
export PATH="$HOME/dex2jar:$PATH"
```

### Homebrew

```bash
brew install dex2jar
```

### Verify

```bash
d2j-dex2jar --help
```

## Core invocation

```bash
# -f overwrites existing output
d2j-dex2jar -f -o output.jar app.apk
```

Works on `.apk` and `.dex` inputs. For multi-dex APKs the tool merges all DEX files into a single output JAR by default.

## Full APK → Fernflower pipeline

```bash
# Step 1: DEX → JAR
d2j-dex2jar -f -o app-converted.jar app.apk

# Step 2: Decompile
java -jar vineflower.jar -dgs=1 -mpm=60 app-converted.jar output/

# Step 3: Extract the resulting source JAR
unzip -o output/app-converted.jar -d output/sources/
```

## Common failures

| Symptom | Cause / workaround |
|---|---|
| `ZipException` on `.apk` | Non-standard APK ZIP structure; fall back to jadx which reads DEX directly |
| Missing `classes2.dex` in output | Multi-dex APK was only partially processed; run against each `classes*.dex` individually after unzipping the APK |
| Output JAR has no `.class` files | dex2jar silently skipped unknown opcodes — usually newer Android runtime features; try a newer dex2jar release or use jadx |

## Which decompiler to pair with it

- **Vineflower** — recommended modern JVM decompiler (active maintenance, best modern-Java support).
- **Fernflower** — the JetBrains original; same CLI as Vineflower.
- **CFR / Procyon** — alternative JVM decompilers; useful for cross-validation.

## When to skip dex2jar entirely

Prefer jadx (direct DEX reader) when:

- You only need one engine on an APK.
- You need resource decoding alongside source decompilation.
- The APK is very large and the two-step pipeline would be slow.

Use dex2jar whenever jadx output has errors or warnings on specific classes, and you want Fernflower/Vineflower's output for those classes as a second opinion.
