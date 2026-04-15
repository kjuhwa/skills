# Alpine container font cache + locale for rendering engines

## Problem
Alpine images ship with neither CJK fonts nor glibc-style locales. Anything that renders text to PDF/XLS/image (OZ Report, Jasper, wkhtmltopdf, headless Chrome) outputs empty boxes or falls back to a Latin-only font.

## Recipe

```dockerfile
# 1. musl-locales gives you LC_ALL on Alpine (Alpine uses musl libc)
RUN apk update && apk add --no-cache musl-locales fontconfig ttf-dejavu

# 2. UTF-8 locale — persist in env AND /etc/profile so sub-shells inherit
ENV LANG=ko_KR.UTF-8 LC_ALL=ko_KR.UTF-8 LANGUAGE=ko_KR.UTF-8
RUN echo "export LANG=ko_KR.UTF-8"    >> /etc/profile \
 && echo "export LC_ALL=ko_KR.UTF-8"  >> /etc/profile \
 && echo "export LANGUAGE=ko_KR.UTF-8" >> /etc/profile

# 3. Copy project-bundled fonts into the fontconfig search path and rebuild cache
COPY report/fonts/* /usr/share/fonts/
RUN fc-cache -f -v
```

## Gotchas
- `fc-cache -f -v` must run **after** the font copy, in the same layer as the final font directory, otherwise the cache is baked without the new fonts.
- `musl-locales` is Alpine-specific. On Debian/Ubuntu slim use `locales` + `locale-gen ko_KR.UTF-8`.
- Fonts go under `/usr/share/fonts/` (top-level; subdirectories are fine). `~/.fonts` does not work in containers that run as non-root without passthrough.
- Verify inside the container: `fc-list | grep -i <family>`.

## Counter / Caveats
- Don’t `apk add ttf-*` for every font — APK CJK packages are huge. Vendor just the glyphs you need.
- Some rendering engines (OZ Report) embed fonts into PDF; set `pdf.fontembedding=true` so output PDFs render outside the container too.
