---
name: decompile-apk-with-jadx
description: Decompile an Android APK/JAR/AAR into readable Java sources and resources using jadx, with presets for obfuscated, resource-heavy, and low-memory cases.
category: reverse-engineering
version: 1.0.0
tags: [android, reverse-engineering, jadx, apk, decompile]
source_type: extracted-from-git
source_url: https://github.com/SimoneAvogadro/android-reverse-engineering-skill.git
source_ref: master
source_commit: ddeb9bc33272db1e34107fd286098bb1e9896e51
source_project: android-reverse-engineering-skill
source_path: plugins/android-reverse-engineering/skills/android-reverse-engineering/references/jadx-usage.md
imported_at: 2026-04-18T03:31:43Z
confidence: high
version_origin: extracted
---

# Decompile APK with jadx

`jadx` is the default first-pass decompiler for any Android artifact (`.apk`, `.xapk`, `.jar`, `.aar`, `.dex`, or a multi-dex ZIP). It is the only engine in the toolchain that handles resources (AndroidManifest, layouts, drawables) directly, and is the right choice when you still don't know the app's shape.

## When to use

- First pass on any APK — fastest, handles resources.
- Quick overview of a large APK: add `--no-res` to skip resource decoding.
- Obfuscated apps: use `--deobf` (optionally `--deobf-map <proguard-map>`).
- Need a Gradle project for IDE import: use `-e` / `--export-gradle`.

## Procedure

1. **Verify prerequisites** — Java JDK 17+ and `jadx` on `PATH`. Check with `java -version` and `jadx --version`.

2. **Pick options for the case**:

   | Situation | Flags |
   |---|---|
   | Default full decompile | `-d <output> <input>` |
   | Fast code-only preview | `--no-res --show-bad-code -d <output> <input>` |
   | Obfuscated app | `--deobf --show-bad-code -d <output> <input>` |
   | Known ProGuard map | `--deobf-map mapping.txt -d <output> <input>` |
   | IDE import | `-e -d <output> <input>` |
   | Out-of-memory on large APK | prefix `-Xmx4g` (e.g. `jadx -Xmx4g -d out app.apk`) |

3. **Run**:

   ```bash
   jadx [flags] -d <output-dir> <input>
   ```

   Produces `<output>/sources/` (Java) and `<output>/resources/` (AndroidManifest + layouts + drawables).

4. **Triage warnings**: classes that decompile with errors or many `// Error` comments are candidates to redo with Fernflower/Vineflower (`decompile-jar-with-fernflower-vineflower`). Retry problem classes only, not the whole APK.

5. **Multi-dex**: if `classes2.dex`, `classes3.dex`, ... exist and jadx didn't cover them, unzip the APK and point jadx at the individual DEX files.

## Counter / Caveats

- jadx output is pragmatic, not pretty — complex lambdas, generics, and stream pipelines often decompile poorly. Switch to Fernflower for those specific classes.
- Fernflower does **not** read APK/DEX directly; you need dex2jar as a bridge (see the paired skill).
- `--deobf` generates *readable* replacement names, not the original names. If a ProGuard mapping file ships with the app (`assets/`) or the build artifacts, prefer `--deobf-map`.
- Obfuscated APKs often ship with *multiple* DEXes and ResourceObfuscation (renamed `res/` entries). Resource renaming does not affect code; ignore it for API extraction.

## References

- Upstream SKILL.md: `plugins/android-reverse-engineering/skills/android-reverse-engineering/SKILL.md`
- Upstream CLI reference: `references/jadx-usage.md`
- Upstream helper: `scripts/decompile.sh` (wraps the flags above and also handles XAPK splitting)
