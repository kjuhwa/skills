---
version: 0.1.0-draft
name: rpm-version-field-hyphen-constraint
summary: The RPM `Version` field forbids hyphens; when an upstream version string contains a hyphen (e.g., `1.1.799-1.3.3`), it must be split on the hyphen into `Version` (part before) and `Release` (part after) to satisfy `rpmbuild`.
category: rpm
tags: [rpm, rpmbuild, version, packaging, fedora, rhel, version-string]
source_type: extracted-from-git
source_url: https://github.com/aaddrick/claude-desktop-debian.git
source_ref: main
source_commit: 2fd9faf9db4eaa409b88310bdce397f8bdb0e916
source_project: claude-desktop-debian
imported_at: 2026-04-18T00:00:00Z
version_origin: extracted
confidence: high
---

# RPM Version Field Hyphen Constraint

## Context

When building RPM packages that wrap an upstream application, the wrapper
project often includes its own version suffix appended to the upstream version
(e.g., upstream is `1.1.799`, wrapper adds `-1.3.3` to produce
`1.1.799-1.3.3`). This composite version string is convenient for deb packages
(`Version: 1.1.799-1.3.3` is valid) but causes `rpmbuild` to fail.

## Observation

`rpmbuild` rejects any `Version:` field containing a hyphen with an error
similar to:

```
error: illegal char '-' in Version: 1.1.799-1.3.3
```

The RPM spec format reserves the hyphen as a separator between the `Version`
and `Release` fields in the EVR (Epoch:Version-Release) tuple. Placing it
inside the `Version` field is therefore a syntax error.

The same version string that Debian accepts (`dpkg-deb` allows hyphens in
`Version:`) breaks RPM unconditionally.

## Why it happens

RPM's NEVRA format (Name-Epoch:Version-Release.Architecture) uses the hyphen
as a structural delimiter. The `Version` field must match `[^-\s]+` — no
hyphens, no whitespace. This is defined in the RPM File Format specification
and enforced at spec-parse time.

Debian's version format has the opposite convention: a hyphen in the version
string separates the "upstream version" from the "Debian revision", both of
which are valid parts of a `.deb` version.

## Practical implication

When your version string may contain a hyphen, split it before generating the
RPM spec:

```bash
VERSION="1.1.799-1.3.3"

if [[ $VERSION == *-* ]]; then
  RPM_VERSION="${VERSION%%-*}"   # everything before the first hyphen: 1.1.799
  RPM_RELEASE="${VERSION#*-}"   # everything after the first hyphen:  1.3.3
else
  RPM_VERSION="$VERSION"
  RPM_RELEASE="1"
fi

# Use in spec file:
# Version: $RPM_VERSION
# Release: $RPM_RELEASE%{?dist}
```

The resulting filename from `rpmbuild` will be
`package-1.1.799-1.3.3.x86_64.rpm`, which is exactly the same information
in the standard RPM naming convention.

To maintain filename compatibility with the `.deb` and `.AppImage` artifacts
(which use the full composite version), rename the final RPM output after
the build:

```bash
# rpmbuild output: package-1.1.799-1.3.3.x86_64.rpm
# Desired:         package-1.1.799-1.3.3-1.x86_64.rpm  (original $VERSION-1.arch)
final_rpm="$work_dir/${PACKAGE_NAME}-${VERSION}-1.${RPM_ARCH}.rpm"
mv "$(find $work_dir -name "${PACKAGE_NAME}-${RPM_VERSION}*.rpm")" "$final_rpm"
```

Research format-specific version constraints before building; do not assume
that a version string valid for one packaging format is valid for all.

## Source reference

- `scripts/build-rpm-package.sh`: lines 17-26 — the version split with
  comments explaining the constraint, and the final rename step.
- `CLAUDE.md`: "Adding New Package Formats" section lists "Version string
  formats (e.g., RPM cannot have hyphens in Version field)" as the first item
  to research before implementing a new format.
