---
version: 0.1.0-draft
name: vineflower-fernflower-cli-options-reference
summary: Fernflower / Vineflower JVM decompiler CLI flag reference (shared interface), recommended presets for general/obfuscated/max-detail output, APK-via-dex2jar pipeline, and when to prefer Fernflower/Vineflower over jadx.
category: reference
confidence: medium
tags: [android, jvm, fernflower, vineflower, decompiler, cli, reverse-engineering, reference]
source_type: extracted-from-git
source_url: https://github.com/SimoneAvogadro/android-reverse-engineering-skill.git
source_ref: master
source_commit: ddeb9bc33272db1e34107fd286098bb1e9896e51
source_project: android-reverse-engineering-skill
source_path: plugins/android-reverse-engineering/skills/android-reverse-engineering/references/fernflower-usage.md
imported_at: 2026-04-18T03:36:29Z
linked_skills: [android-apk-multi-engine-decompilation]
---

# Vineflower / Fernflower CLI Options Reference

Fernflower is the JetBrains analytical Java decompiler. [Vineflower](https://github.com/Vineflower/vineflower) is the actively maintained community fork with better output quality and published releases — drop-in replacement with the same CLI.

## When to prefer over jadx

| Scenario | Recommended |
|---|---|
| APK with resources needed | jadx |
| Standard Java JAR/library | Fernflower |
| jadx output has warnings on specific classes | Fernflower on those classes |
| Complex lambdas, generics, streams | Fernflower |
| Large APK (>50 MB), quick overview | jadx |
| Obfuscated Android app | jadx first, Fernflower on problem areas |
| Both available | `--engine both` and compare |

## Invocation

```bash
java -jar fernflower.jar [options] <source>... <destination>
```

- `<source>` — JAR, class file, or directory of classes.
- `<destination>` — output directory. JAR input produces a JAR of `.java` files; extract with `unzip`.

## Option syntax

`-<key>=<value>`. Booleans use `1`/`0`.

| Option | Default | Description |
|---|---|---|
| `-dgs=1` | 0 | Decompile generic signatures (recommended) |
| `-ren=1` | 0 | Rename obfuscated identifiers |
| `-mpm=60` | 0 | Max seconds per method — prevents hangs (recommended) |
| `-hes=0` | 1 | Show empty `super()` calls |
| `-hdc=0` | 1 | Show empty default constructors |
| `-udv=1` | 1 | Use debug variable names if available |
| `-ump=1` | 1 | Use debug parameter names if available |
| `-lit=1` | 0 | Output numeric literals as-is |
| `-asc=1` | 0 | Encode non-ASCII as unicode escapes |
| `-lac=1` | 0 | Decompile lambdas as anonymous classes |
| `-log=WARN` | INFO | Reduce output verbosity |
| `-e=<lib>` | — | Add library for context (improves type resolution) |

## Recommended presets

- **General use**: `java -jar fernflower.jar -dgs=1 -mpm=60 input.jar output/`
- **Obfuscated**: `java -jar fernflower.jar -dgs=1 -ren=1 -mpm=60 input.jar output/`
- **Max detail**: `java -jar fernflower.jar -dgs=1 -hes=0 -hdc=0 -mpm=60 input.jar output/`
- **Android context**: add `-e=$ANDROID_HOME/platforms/android-34/android.jar` for better type resolution.

## APK pipeline (via dex2jar)

Fernflower reads only JVM bytecode — APK/DEX need conversion first:

```bash
d2j-dex2jar -f -o app-converted.jar app.apk
java -jar fernflower.jar -dgs=1 -mpm=60 app-converted.jar output/
unzip -o output/app-converted.jar -d output/sources/
```

Automate this — the three-step chain is otherwise error-prone.

## Format support

| Format | Direct | Via dex2jar |
|---|---|---|
| `.jar` | Yes | — |
| `.class` | Yes | — |
| `.zip` (with classes) | Yes | — |
| `.apk` | No | Yes |
| `.dex` | No | Yes |
| `.aar` | No | Yes |

## Vineflower vs Fernflower

Prefer Vineflower:
- Published releases on GitHub + Maven Central
- Better modern Java support (records, sealed classes, pattern matching)
- More accurate lambda and switch-expression decompilation
- Active maintenance — same CLI as Fernflower
