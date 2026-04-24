---
name: atomic-audio-save-temp-rename
description: Write audio (or any binary) atomically by staging to a sibling .tmp file and os.replace-ing it into place on success.
category: python
version: 1.0.0
version_origin: extracted
tags: [python, atomic-writes, filesystem, soundfile, reliability]
source_type: extracted-from-git
source_url: https://github.com/jamiepine/voicebox.git
source_ref: main
source_commit: 476abe07fc2c1587f4b3e3916134018ebacd143d
source_project: voicebox
confidence: high
imported_at: 2026-04-18T00:00:00Z
---

# Atomic audio save (temp + rename)

## When to use
Any process that writes user-visible output files (generated audio, rendered images, exported bundles) where a crash mid-write would leave a corrupt half-file that the app then tries to play / load on next startup.

## Steps
1. Accept the final `path`. Compute `temp_path = f"{path}.tmp"` in the same directory — same-volume guarantees `os.replace` is atomic.
2. `Path(path).parent.mkdir(parents=True, exist_ok=True)` so downstream writes never fail on a missing data subdirectory.
3. Write to `temp_path`. For `soundfile.write`, pass `format='WAV'` (or whatever container) explicitly because the `.tmp` extension does not match any recognized format and the default sniffer will raise.
4. `os.replace(temp_path, path)`. On POSIX and Win32 this is atomic — either old or new wins, never a truncated file.
5. Wrap the whole thing in try/except. On exception, attempt to unlink the `.tmp` (best-effort `try/except: pass`) and re-raise as a clearly-labeled `OSError("Failed to save audio to ...")` with the original as `__cause__`.
6. Return nothing / the final path. Never return from inside the try block before the `os.replace`.

## Counter / Caveats
- `os.rename` is NOT atomic on Windows if the destination exists; `os.replace` is. Always prefer `os.replace`.
- The "same filesystem" requirement is the common pitfall — `/tmp` is frequently a separate volume. Keep the `.tmp` sibling.
- If the caller is interrupted after the write but before the replace, you'll leave an orphan `.tmp`. A startup-time cleanup ("delete .tmp files older than N minutes in data dirs") is a reasonable sweep if you care.
- For large files, consider `fsync(temp_fd)` before rename to guarantee durability — `os.replace` is atomic but the new content may still be in the page cache until fsync.

Source references: `backend/utils/audio.py` (`save_audio`).
