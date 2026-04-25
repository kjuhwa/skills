---
version: 0.1.0-draft
name: android-decompilation-toolchain-setup
summary: Install recipes for the Android reverse-engineering toolchain — Java JDK 17+, jadx, Vineflower/Fernflower, dex2jar, and optional apktool/adb — across Ubuntu, Fedora, Arch, and macOS (Homebrew), with verify commands and common troubleshooting.
category: reference
confidence: medium
tags: [android, reverse-engineering, setup, install, java, jadx, vineflower, dex2jar, apktool, adb, reference]
source_type: extracted-from-git
source_url: https://github.com/SimoneAvogadro/android-reverse-engineering-skill.git
source_ref: master
source_commit: ddeb9bc33272db1e34107fd286098bb1e9896e51
source_project: android-reverse-engineering-skill
source_path: plugins/android-reverse-engineering/skills/android-reverse-engineering/references/setup-guide.md
imported_at: 2026-04-18T03:36:29Z
linked_skills: [android-apk-multi-engine-decompilation, dependency-check-install-precondition-gate]
---

# Android Decompilation Toolchain Setup

## Java JDK 17+ (required by jadx)

| OS | Command |
|---|---|
| Ubuntu/Debian | `sudo apt install openjdk-17-jdk` |
| Fedora | `sudo dnf install java-17-openjdk-devel` |
| Arch | `sudo pacman -S jdk17-openjdk` |
| macOS (Homebrew) | `brew install openjdk@17` |

macOS Homebrew doesn't auto-symlink — add to shell profile:

```bash
export PATH="/opt/homebrew/opt/openjdk@17/bin:$PATH"
```

Verify: `java -version` (must show 17.x or higher).

## jadx

**Option 1 — GitHub Releases (recommended):**

```bash
# Grab jadx-<version>.zip from https://github.com/skylot/jadx/releases/latest
unzip jadx-*.zip -d ~/jadx
export PATH="$HOME/jadx/bin:$PATH"   # persist in ~/.bashrc or ~/.zshrc
```

**Option 2 — Homebrew:** `brew install jadx`

**Option 3 — Build from source:**

```bash
git clone https://github.com/skylot/jadx.git
cd jadx && ./gradlew dist
export PATH="$(pwd)/build/jadx/bin:$PATH"
```

Verify: `jadx --version`.

## Vineflower / Fernflower (optional, recommended)

Vineflower is the actively maintained fork of Fernflower — prefer it.

**Option 1 — GitHub Releases:**

```bash
# Grab vineflower-<version>.jar from https://github.com/Vineflower/vineflower/releases/latest
mkdir -p ~/vineflower
mv vineflower-*.jar ~/vineflower/vineflower.jar
export FERNFLOWER_JAR_PATH="$HOME/vineflower/vineflower.jar"
```

**Option 2 — Build Fernflower from source:**

```bash
git clone https://github.com/JetBrains/fernflower.git
cd fernflower && ./gradlew jar
export FERNFLOWER_JAR_PATH="$(pwd)/build/libs/fernflower.jar"
```

**Option 3 — Homebrew:** `brew install vineflower`

Verify: `java -jar "$FERNFLOWER_JAR_PATH" --version`.

Fernflower/Vineflower reads JVM bytecode only. For APK/DEX input, also install **dex2jar** (next section).

## dex2jar (optional, needed for Fernflower on APK)

**GitHub Releases:**

```bash
# Grab dex-tools-*.zip from https://github.com/pxb1988/dex2jar/releases/latest
unzip dex-tools-*.zip -d ~/dex2jar
export PATH="$HOME/dex2jar:$PATH"
```

**Homebrew:** `brew install dex2jar`

Verify: `d2j-dex2jar --help`.

Typical use:

```bash
d2j-dex2jar -f -o output.jar app.apk
java -jar vineflower.jar output.jar decompiled/
```

## Optional: apktool

Useful for decoding XML layouts and drawables that jadx sometimes handles poorly.

```bash
# Ubuntu/Debian
sudo apt install apktool

# macOS
brew install apktool
```

Manual install: https://apktool.org/docs/install

## Optional: adb (Android Debug Bridge)

Pull APKs directly from a connected device.

```bash
# Ubuntu/Debian
sudo apt install adb

# macOS
brew install android-platform-tools
```

Pull flow:

```bash
adb shell pm list packages | grep <keyword>
adb shell pm path com.example.app
adb pull /data/app/com.example.app-xxxx/base.apk ./app.apk
```

## Troubleshooting

| Problem | Fix |
|---|---|
| `jadx: command not found` | Ensure `jadx/bin/` is on `PATH` |
| `Could not find or load main class` | Java missing or wrong version — `java -version` |
| jadx OOM on large APKs | `jadx -Xmx4g -d output app.apk`, or `JAVA_OPTS="-Xmx4g"` |
| Many `// Error` comments | `--show-bad-code`; or `--deobf` for obfuscated apps |
| Fernflower hangs on a method | `-mpm=60` (60-sec per-method timeout) |
| Fernflower JAR not found | Set `FERNFLOWER_JAR_PATH` to the full JAR path |
| `dex2jar ZipException` | Non-standard APK ZIP — fall back to jadx |
