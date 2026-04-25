---
name: rpm-package-from-electron-no-hyphens
description: Generate an RPM spec file for an Electron app that correctly splits hyphenated version strings into Version/Release fields, maps Debian architecture names (amd64→x86_64, arm64→aarch64), and disables binary stripping and debug package generation.
category: rpm
version: 1.0.0
tags: [rpm, fedora, packaging, electron, spec, arch-mapping, version-string]
source_type: extracted-from-git
source_url: https://github.com/aaddrick/claude-desktop-debian.git
source_ref: main
source_commit: 2fd9faf9db4eaa409b88310bdce397f8bdb0e916
source_project: claude-desktop-debian
imported_at: 2026-04-18T00:00:00Z
version_origin: extracted
confidence: high
---

# RPM Package from Electron App (No Hyphens in Version)

## When to use

Use this pattern when:
- You are building an RPM package for an Electron app from a CI/CD script.
- Your version string may contain hyphens (e.g., `1.1.799-1.3.3`) because it encodes both an upstream app version and a wrapper/packaging version.
- You are producing packages on both Debian-family and RPM-family systems from the same build pipeline and want consistent version semantics.
- You need to suppress automatic dependency detection, binary stripping, and debug package generation (all of which are incompatible with pre-built Electron binaries).

## Pattern

### Version splitting

```
Input:  version="1.1.799-1.3.3"
Output: rpm_version="1.1.799"   (before first hyphen)
        rpm_release="1.3.3"      (after first hyphen)

Input:  version="1.1.799"        (no hyphen)
Output: rpm_version="1.1.799"
        rpm_release="1"           (default release)
```

### Architecture mapping

| Input (Debian) | Output (RPM) |
|---|---|
| `amd64` | `x86_64` |
| `arm64` | `aarch64` |

### Critical spec directives for Electron binaries

```spec
AutoReqProv:    no          # disable automatic dependency scanning
%define debug_package %{nil} # disable debug package
%define __strip /bin/true   # disable binary stripping
%define _build_id_links none # disable build ID generation
```

## Minimal example

```bash
#!/usr/bin/env bash
version="$1"; architecture="$2"; work_dir="$3"
app_staging_dir="$4"; package_name="$5"
description="${7:-My Electron App}"

# Split version on first hyphen
if [[ $version == *-* ]]; then
    rpm_version="${version%%-*}"
    rpm_release="${version#*-}"
else
    rpm_version="$version"
    rpm_release="1"
fi

# Map architecture names
case "$architecture" in
    amd64) rpm_arch='x86_64' ;;
    arm64) rpm_arch='aarch64' ;;
    *) echo "Unsupported arch: $architecture" >&2; exit 1 ;;
esac

rpmbuild_dir="$work_dir/rpmbuild"
rm -rf "$rpmbuild_dir"
mkdir -p "$rpmbuild_dir"/{BUILD,RPMS,SOURCES,SPECS,SRPMS}

# Create launcher script
launcher="$work_dir/rpm-staging/$package_name"
mkdir -p "$(dirname "$launcher")"
cat > "$launcher" << LAUNCHER
#!/usr/bin/env bash
source "/usr/lib/$package_name/launcher-common.sh"
setup_logging || exit 1
setup_electron_env
cleanup_stale_lock
detect_display_backend
electron_exec="/usr/lib/$package_name/node_modules/electron/dist/electron"
app_path="/usr/lib/$package_name/node_modules/electron/dist/resources/app.asar"
build_electron_args 'deb'
electron_args+=("\$app_path")
cd "/usr/lib/$package_name" || exit 1
exec "\$electron_exec" "\${electron_args[@]}" "\$@"
LAUNCHER
chmod +x "$launcher"

# Create desktop entry
desktop_file="$work_dir/rpm-staging/$package_name.desktop"
cat > "$desktop_file" << EOF
[Desktop Entry]
Name=My App
Exec=/usr/bin/$package_name %u
Icon=$package_name
Type=Application
Terminal=false
Categories=Office;Utility;
MimeType=x-scheme-handler/myapp;
StartupWMClass=MyApp
EOF

# Write RPM spec
cat > "$rpmbuild_dir/SPECS/$package_name.spec" << SPECEOF
Name:           $package_name
Version:        $rpm_version
Release:        $rpm_release%{?dist}
Summary:        $description

License:        Proprietary
URL:            https://example.com

AutoReqProv:    no
%define debug_package %{nil}
%define __strip /bin/true
%define _build_id_links none

%description
$description

%install
rm -rf %{buildroot}
mkdir -p %{buildroot}/usr/lib/$package_name
mkdir -p %{buildroot}/usr/share/applications
mkdir -p %{buildroot}/usr/bin

# Install icons
for size in 16 24 32 48 64 256; do
    icon_dir=%{buildroot}/usr/share/icons/hicolor/\${size}x\${size}/apps
    mkdir -p "\$icon_dir"
    icon_src="$work_dir/app_\${size}x\${size}.png"
    [ -f "\$icon_src" ] && install -Dm 644 "\$icon_src" "\$icon_dir/$package_name.png"
done

# Install app files
cp -r $app_staging_dir/node_modules %{buildroot}/usr/lib/$package_name/
cp    $app_staging_dir/app.asar     %{buildroot}/usr/lib/$package_name/node_modules/electron/dist/resources/
cp -r $app_staging_dir/app.asar.unpacked \
      %{buildroot}/usr/lib/$package_name/node_modules/electron/dist/resources/
cp scripts/launcher-common.sh %{buildroot}/usr/lib/$package_name/

install -Dm 644 $desktop_file  %{buildroot}/usr/share/applications/$package_name.desktop
install -Dm 755 $launcher      %{buildroot}/usr/bin/$package_name

%post
update-desktop-database /usr/share/applications >/dev/null 2>&1 || true
SANDBOX="/usr/lib/$package_name/node_modules/electron/dist/chrome-sandbox"
if [ -f "\$SANDBOX" ]; then
    chown root:root "\$SANDBOX" || true
    chmod 4755 "\$SANDBOX" || true
fi

%postun
update-desktop-database /usr/share/applications >/dev/null 2>&1 || true

%files
%defattr(-, root, root, 0755)
%attr(755, root, root) /usr/bin/$package_name
/usr/lib/$package_name
/usr/share/applications/$package_name.desktop
/usr/share/icons/hicolor/*/apps/$package_name.png
SPECEOF

# Build RPM
rpmbuild --define "_topdir $rpmbuild_dir" \
         --define "_rpmdir $work_dir" \
         --target "$rpm_arch" \
         -bb "$rpmbuild_dir/SPECS/$package_name.spec"

# Find and rename to consistent filename
rpm_file=$(find "$work_dir" -name "${package_name}-${rpm_version}*.rpm" -type f | head -1)
final_rpm="$work_dir/${package_name}-${version}-1.${rpm_arch}.rpm"
[[ "$rpm_file" != "$final_rpm" ]] && mv "$rpm_file" "$final_rpm"
echo "Built: $final_rpm"
```

## Why this works

### Hyphen prohibition in RPM `Version:`

RPM's `rpmvercmp` algorithm uses hyphens as field separators between `Version`, `Release`, and `Epoch`. A hyphen in the `Version:` field is a parse error. You must split `1.1.799-1.3.3` into `Version: 1.1.799` and `Release: 1.3.3` before writing the spec.

### `%{?dist}` suffix in Release

The `%{?dist}` macro expands to the distribution tag (e.g., `.fc40`, `.el9`) when built on that distro. If the macro is undefined (e.g., in a container without rpm macros), it expands to nothing. This makes the resulting filename correct on each target distro without hardcoding.

### `AutoReqProv: no`

RPM automatically scans ELF binaries for shared library dependencies and generates `Requires:` entries. Electron's bundled binaries reference many system libraries. On Fedora 40, some of these may differ from the host's library versions. `AutoReqProv: no` suppresses this scanner for the whole package, preventing spurious unresolvable dependency errors.

### `%define __strip /bin/true`

RPM's build process strips debug symbols from binaries by default. Stripping Electron's pre-built ELF files can corrupt them (Electron embeds important data in sections that `strip` considers debug-only). Replacing `__strip` with `/bin/true` is a no-op strip that preserves the binaries.

### Architecture file renaming

`rpmbuild` places output files in `$_rpmdir/$rpm_arch/package-version.rpm`. The final filename uses the RPM arch (`x86_64`), but the build pipeline convention uses Debian arch (`amd64`). Renaming the output file after build gives consistent filenames across all package formats.

## Pitfalls

- **`%install` section uses absolute source paths** — unlike debhelper, RPM specs do not have an implicit source tree. Use absolute paths to staging directories (passed from the build script). Relative paths in `%install` are relative to the rpmbuild `BUILD/` directory, not the project root.
- **`%files` glob for icons requires actual files to exist** — `/usr/share/icons/hicolor/*/apps/$package_name.png` will cause build failure if no icon files are installed. Guard icon installation with `[ -f "$icon_src" ]`.
- **`%post` chrome-sandbox requires `chown root:root` at runtime** — the sandbox file is installed as the build user. Only the `%post` scriptlet runs as root during installation. Do not attempt setuid in `%install`.
- **SRPMS directory must exist** — `rpmbuild` expects the full `{BUILD,RPMS,SOURCES,SPECS,SRPMS}` hierarchy even when building binary-only (`-bb`). Creating all five subdirectories avoids `No such file or directory` errors.
- **Embedded paths in spec file** — the spec file interpolates shell variables at write time. If `$app_staging_dir` contains spaces, the spec will be malformed. Use paths without spaces in staging directories.

## Source reference

`scripts/build-rpm-package.sh` — full implementation
