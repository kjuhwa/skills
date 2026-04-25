---
version: 0.1.0-draft
name: deb-icon-size-windows-exe-index-mapping
summary: Windows `.exe` files pack multiple icon sizes by embedded index; to produce FDO hicolor icons for a Linux package, map each target size (16, 24, 32, 48, 64, 256) to its corresponding image index in the exe using `icoutils` (`wrestool`/`icotool`).
category: deb
tags: [deb, icons, icoutils, wrestool, icotool, hicolor, fdo, windows-exe, imagemagick]
source_type: extracted-from-git
source_url: https://github.com/aaddrick/claude-desktop-debian.git
source_ref: main
source_commit: 2fd9faf9db4eaa409b88310bdce397f8bdb0e916
source_project: claude-desktop-debian
imported_at: 2026-04-18T00:00:00Z
version_origin: extracted
confidence: medium
---

# Deb Icon Size / Windows EXE Index Mapping

## Context

When repackaging a Windows application for Linux, the application icon is
typically embedded in the `.exe` file as an `ICON` resource group. The resource
contains multiple sizes (16×16, 24×24, 32×32, 48×48, 64×64, 256×256) packed
as a multi-image `.ico` file.

Linux package standards (Freedesktop.org / FDO) require icons to be installed
as individual PNG files in the `hicolor` icon theme at specific sizes:
`/usr/share/icons/hicolor/<size>x<size>/apps/<name>.png`.

The challenge is mapping from the exe's embedded index numbers to the FDO
target sizes.

## Observation

`wrestool` (from the `icoutils` package) extracts icon resources from PE
executables. `icotool` converts `.ico` files to individual PNGs.

Each image inside the `.ico` resource has an index number (1-based). The
mapping between index and size is:

| FDO size | exe image index | Notes |
|---|---|---|
| 16×16 | 13 | Smallest UI icon |
| 24×24 | 11 | |
| 32×32 | 10 | |
| 48×48 | 8 | |
| 64×64 | 7 | |
| 256×256 | 6 | Used for HiDPI / app launcher |

This mapping is specific to the resource packing used by the Squirrel installer
format (used by Electron apps built with Squirrel.Windows). Other installers
may have different orderings.

The extracted PNGs are then installed to the appropriate hicolor directories.

## Why it happens

Windows `.ico` format stores multiple bitmap sizes within a single file, ordered
by the application developer. The index is positional, not tied to size metadata
at the container level (though the individual image headers do encode dimensions).

`icotool -x -i <index>` extracts the image at a specific 1-based index without
needing to parse the ICO format manually.

`ImageMagick`'s `convert` can be used as an alternative or fallback to resize
images if a specific size is missing from the exe.

## Practical implication

```bash
# Extract the .ico resource from the exe
wrestool -x -t 14 installer.exe -o app-icon.ico

# Extract each size from the .ico by index and install to hicolor
declare -A INDEX_FOR_SIZE=(
  [16]=13 [24]=11 [32]=10 [48]=8 [64]=7 [256]=6
)

for size in "${!INDEX_FOR_SIZE[@]}"; do
  index="${INDEX_FOR_SIZE[$size]}"
  icon_dir="/usr/share/icons/hicolor/${size}x${size}/apps"
  mkdir -p "$icon_dir"

  icotool -x -i "$index" app-icon.ico -o "$icon_dir/app-name.png" 2>/dev/null \
    || convert "app-icon.ico[${index}]" -resize "${size}x${size}" \
       "$icon_dir/app-name.png"
done
```

The resource type `14` in `wrestool -t 14` corresponds to `RT_GROUP_ICON` in
the Windows PE resource type enumeration. Use `wrestool -l installer.exe` to
list all resources and confirm the type and name of the icon resource.

For installers that ship a standalone `.ico` file alongside the exe (e.g., in
the extracted nupkg), extract directly from the `.ico` without `wrestool`:

```bash
icotool -x -i "$index" app.ico -o "$icon_dir/app.png"
```

## Source reference

- `scripts/build-deb-package.sh`: `icon_files` associative array with size→index
  mapping, `icotool` extraction loop.
- `scripts/build-rpm-package.sh`: identical `icon_files` array — both scripts
  use the same mapping.
- `nix/claude-desktop.nix`: `installPhase` icon loop using `find build/ -name
  "app_*${size}x${size}x32.png"` — Nix variant uses the same extracted files.
