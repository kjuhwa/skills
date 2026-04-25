---
name: decompile-jar-with-fernflower-vineflower
description: Decompile standard JVM bytecode (JAR/class files) using Fernflower or Vineflower with quality presets, and use it as a second opinion on classes where jadx produces warnings.
category: reverse-engineering
version: 1.0.0
tags: [fernflower, vineflower, jvm, decompile, java, reverse-engineering]
source_type: extracted-from-git
source_url: https://github.com/SimoneAvogadro/android-reverse-engineering-skill.git
source_ref: master
source_commit: ddeb9bc33272db1e34107fd286098bb1e9896e51
source_project: android-reverse-engineering-skill
source_path: plugins/android-reverse-engineering/skills/android-reverse-engineering/references/fernflower-usage.md
imported_at: 2026-04-18T03:31:43Z
confidence: high
version_origin: extracted
---

# Decompile JAR with Fernflower / Vineflower

Fernflower is JetBrains' analytical Java decompiler. Vineflower is the actively maintained community fork — same CLI, better output on modern Java (records, sealed classes, pattern matching, lambdas). Use Vineflower as the drop-in replacement.

## When to use

- Standard Java JAR or library analysis (cleaner output than jadx).
- Specific classes where jadx emitted warnings, broken lambdas, or generics soup.
- Need to confirm a subtle control-flow reconstruction (Fernflower is more conservative).

Do **not** point Fernflower at APK/DEX input — it can't read them. Use the paired `dex2jar-bridge-apk-to-fernflower` skill first.

## Procedure

1. **Locate the jar**: set `FERNFLOWER_JAR_PATH` to the `.jar` on disk, or ensure `vineflower`/`fernflower` is on `PATH`.

2. **Pick a preset**:

   | Goal | Command |
   |---|---|
   | General use | `java -jar "$FERNFLOWER_JAR_PATH" -dgs=1 -mpm=60 input.jar output/` |
   | Obfuscated code | `java -jar "$FERNFLOWER_JAR_PATH" -dgs=1 -ren=1 -mpm=60 input.jar output/` |
   | Maximum detail | `java -jar "$FERNFLOWER_JAR_PATH" -dgs=1 -hes=0 -hdc=0 -mpm=60 input.jar output/` |
   | With Android SDK context | add `-e=$ANDROID_HOME/platforms/android-34/android.jar` |

   Key flags: `-dgs=1` decompile generic signatures, `-ren=1` rename obfuscated identifiers, `-mpm=60` cap per-method time at 60s to prevent hangs, `-hes=0 -hdc=0` surface otherwise-hidden super/default-constructor calls.

3. **Unpack the output**: Fernflower emits a `.jar` containing `.java` files. Extract to read:

   ```bash
   unzip -o output/<input-name>.jar -d output/sources/
   ```

4. **Compare with jadx** (optional, `--engine both` in the upstream wrapper): file counts + jadx warning counts on the same classes tell you where Fernflower's output is worth preferring.

## Counter / Caveats

- Fernflower produces Java source only — no resources, no `AndroidManifest.xml`. Always run jadx in parallel if you need those.
- Without `-mpm=<n>` Fernflower can hang on pathological methods. Always set it.
- Upstream Fernflower has no official releases; Vineflower publishes JARs on GitHub and Maven Central — prefer it.
- `-e=<lib.jar>` adds a library to the type-resolution context; it is NOT decompiled. Useful for giving Fernflower the Android SDK or Kotlin stdlib as context.
- Fernflower renames with `-ren=1` differ from jadx's `--deobf` — don't cross-reference generated names between engines.

## References

- Upstream CLI reference: `references/fernflower-usage.md`
- Vineflower: https://github.com/Vineflower/vineflower
