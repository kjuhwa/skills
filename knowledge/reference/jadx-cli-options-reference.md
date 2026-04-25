---
version: 0.1.0-draft
name: jadx-cli-options-reference
summary: jadx decompiler CLI flags and typical workflows — output dir, deobfuscation, bad-code tolerance, resource-skip, Gradle export, heap sizing, and strategies for obfuscated APKs — plus jadx-gui feature notes.
category: reference
confidence: medium
tags: [android, jadx, decompiler, cli, reverse-engineering, reference]
source_type: extracted-from-git
source_url: https://github.com/SimoneAvogadro/android-reverse-engineering-skill.git
source_ref: master
source_commit: ddeb9bc33272db1e34107fd286098bb1e9896e51
source_project: android-reverse-engineering-skill
source_path: plugins/android-reverse-engineering/skills/android-reverse-engineering/references/jadx-usage.md
imported_at: 2026-04-18T03:36:29Z
linked_skills: [android-apk-multi-engine-decompilation, obfuscated-jvm-string-anchor-navigation]
---

# jadx CLI Options Reference

## Basic invocation

```bash
jadx [options] <input-file>
```

Accepted inputs: `.apk`, `.jar`, `.aar`, `.dex`, `.zip`.

## Key options

| Option | Description |
|---|---|
| `-d <dir>` | Output directory for decompiled sources |
| `--deobf` | Rename obfuscated classes/methods to readable names |
| `--show-bad-code` | Show partially decompiled code instead of `// Error` stubs |
| `--no-res` | Skip resource decoding (faster if you only need code) |
| `--no-src` | Skip source decompilation, only decode resources |
| `--export-gradle` / `-e` | Generate a Gradle project (for IDE import) |
| `--threads-count <N>` | Processing threads; default = CPU count |
| `-Xmx<size>` | Max Java heap (e.g. `-Xmx4g` for large APKs) |
| `--deobf-map <file>` | Use a ProGuard mapping file for authoritative rename |

## Output layout for APK

```
output-dir/
  sources/      # decompiled Java
  resources/    # AndroidManifest.xml, layouts, drawables
```

## Common workflows

- **Fastest code-only**: `jadx --no-res --show-bad-code -d output app.apk`
- **Full with deobfuscation**: `jadx --deobf --show-bad-code -d output app.apk`
- **Gradle export for IDE**: `jadx -e -d output app.apk`
- **Multi-dex target**: `unzip app.apk -d extracted/ && jadx -d output extracted/classes2.dex`
- **Large APK**: `jadx -Xmx4g -d output app.apk`

## Obfuscation

1. `--deobf` generates readable names and writes `output-dir/deobf-mapping.txt`.
2. If an actual ProGuard mapping is available, prefer `--deobf-map mapping.txt` for authoritative rename.
3. Otherwise rely on string literals and library annotations (Retrofit, OkHttp) as anchors — they're never obfuscated.

## jadx-gui

`jadx-gui app.apk` opens an interactive viewer in the same distribution. Features:

- Full-text search across decompiled sources
- Click-through navigation (jump-to-definition)
- Live renaming during deobfuscation
- Smali view alongside Java

## Troubleshooting

| Symptom | Fix |
|---|---|
| `jadx: command not found` | Ensure `jadx/bin/` is on `PATH` |
| `Could not find or load main class` | Wrong/missing Java; need JDK 17+ |
| OOM on large APK | `-Xmx4g` or `JAVA_OPTS="-Xmx4g"` |
| Many `// Error` stubs | `--show-bad-code`, or `--deobf` if obfuscated |
