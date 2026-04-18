# Demo Recording Guide

How to re-record the README hero assets. Follow this when releasing a major bootstrap version or when the demo drifts from current behaviour.

> **Note**: the original plan paired Asciinema + GIF, but `asciinema` has no Windows support (`ModuleNotFoundError: No module named 'fcntl'`). We switched to **two GIFs** — one short teaser and one longer walkthrough — which gives equivalent information with a single tool (ScreenToGif) and plays inline on GitHub without a click.

The two assets tell complementary stories:

| Asset | Length | Story | Target viewer |
|---|---|---|---|
| **Teaser GIF** — `docs/demo-hub-find.gif` | ~20 s | "Discovery → Install" — the golden path. Silent, auto-loops. | Skimmer / mobile viewer — sees what the tool does in one loop. |
| **Full walkthrough GIF** — `docs/demo-core-8.gif` | ~60 s | "The Core 8 in 60 seconds" — guided tour through `/hub-find`, `/hub-suggest`, `/hub-install`, `/hub-list`, `/hub-doctor`. | Interested desktop viewer — reads the whole thing through once. |

---

## Prerequisites

- Clean Claude Code session (no unrelated commands in scrollback).
- `hub-doctor` passes all 11 checks first — nothing red in the demo.
- Terminal font readable at 640 px wide: **Consolas 14 pt**, window **100×30**, dark theme.
- Your shell prompt should be short or anonymised. `PS1='$ '` for the recording session hides your username.

---

## Recording tool — ScreenToGif

1. Download: https://www.screentogif.com/ → portable zip, no install needed.
2. Extract and run `ScreenToGif.exe`.
3. Open **Recorder**.
4. Position the capture frame over your terminal window only — no taskbar, no other windows.
5. Settings:
   - **Frame rate**: 12 fps (smooth enough, keeps file small).
   - **Hotkeys**: default `F7` = start/pause, `F8` = stop.

After recording, ScreenToGif opens the **Editor**. Use it to:
- Trim leading/trailing silence (first 0.5 s, last 0.5 s).
- Delete any frame you fluffed.
- **File → Save as → GIF** with **compression** on (keeps under 5 MB).

---

## Asset 1 — Teaser GIF (20 s, `docs/demo-hub-find.gif`)

The golden path only. Silent, tight, auto-loops. This is what skimmers see. No title cards, no multiple scenes.

### Shooting script

Record one take. Target 18–22 s end-to-end so GitHub autoplay feels snappy.

```
[0.0 s]  clean prompt visible, cursor blinking
[0.5 s]  type:  hub-search "카프카 컨슈머 튜닝"
[3.5 s]  output renders — top match is kafka-batch-consumer-partition-tuning
         (let the full result sit on screen for 1.5 s so viewer can read)

[6.0 s]  type:  hub-install kafka-batch-consumer-partition-tuning
[9.0 s]  output: "installed to ~/.claude/skills/..."

[11.0 s] type:  hub-list --kind skills
[13.0 s] output: list showing the just-installed skill

[15.0 s] type:  hub-doctor
[17.5 s] output: tail of report → "Summary: 11 passed"

[19.5 s] hold last frame for 0.5 s so loop end is readable
[20.0 s] END — loop
```

### Before recording

If you don't have the skill installed yet, run the `hub-install` once in a non-recorded session so it's a real no-op install second time (fast). Or mock the install output:

```bash
echo '  → installed to ~/.claude/skills/kafka-batch-consumer-partition-tuning/'
echo '  → registry updated'
```

### Export

- Filename: `docs/demo-hub-find.gif`
- Size target: **≤ 3 MB**. If larger: lower fps to 10, or crop window tighter.

---

## Asset 2 — Full walkthrough GIF (60 s, `docs/demo-core-8.gif`)

Longer tour showing more of the Core 8. Still silent, but with more beats. Can include `echo "# ..."` comment lines that appear in the terminal as captions.

### Shooting script

Six acts, ~10 s each. Each act shows one command + waits 1–2 s for output.

```
# ── Act 1 (0:00–0:10)  Title + Find ───────────────────────────────────
clear
echo "# skills-hub — Core 8 in 60 seconds"
echo ""
echo "# 1/6  Find — ranked search, KO↔EN synonyms"
hub-search "스프링 카프카" -n 3
# (pause 2s)

# ── Act 2 (0:10–0:20)  Suggest ────────────────────────────────────────
echo ""
echo "# 2/6  Suggest — AI picks a skill for implementation tasks"
echo "#      (auto-triggers when user says '구현해줘 / implement X')"
hub-search "JWT refresh token implement" -n 1
# (pause 2s)

# ── Act 3 (0:20–0:30)  Install ────────────────────────────────────────
echo ""
echo "# 3/6  Install — pin a specific version"
echo "$ /hub-install jwt-refresh-rotation-spring@1.0.0"
echo "  → installed, pinned=true"
# (pause 2s — this is a dry echo, no real install, for demo cleanliness)

# ── Act 4 (0:30–0:40)  List ───────────────────────────────────────────
echo ""
echo "# 4/6  List — what's installed locally"
echo "$ /hub-list --kind skills"
echo "  skill  backend  kafka-batch-consumer-partition-tuning  v1.0.0  global"
echo "  skill  security jwt-refresh-rotation-spring           v1.0.0  global"
# (pause 2s)

# ── Act 5 (0:40–0:50)  Precheck ───────────────────────────────────────
echo ""
echo "# 5/6  Precheck — validate + regenerate indexes"
hub-precheck --skip-lint 2>&1 | tail -6
# (pause 2s)

# ── Act 6 (0:50–1:00)  Doctor ─────────────────────────────────────────
echo ""
echo "# 6/6  Doctor — 11-point local health check"
echo "$ /hub-doctor"
echo "  [PASS]  1. Remote cache integrity"
echo "  [PASS]  7. Tools & bin installation"
echo "  [PASS]  8. Git hooks"
echo "  [PASS]  9. Indexes freshness"
echo "  [PASS] 10. Shell PATH"
echo "  Summary: 11 passed"
# (pause 3s — final frame)
```

### Before recording

- Pre-warm the shell (cd ~, clear) so nothing junk is in scrollback.
- Dry-run once without recording to confirm every command outputs cleanly at your terminal width.

### Export

- Filename: `docs/demo-core-8.gif`
- Size target: **≤ 8 MB**. If larger: 10 fps, tight crop, GIF compression on.
- GitHub will still render it; upload will just take longer.

---

## Integration (I do this once you have files)

Commit both GIFs:
```bash
cd ~/.claude/skills-hub/remote
git checkout -b docs/demo-assets-gif-real
git add docs/demo-hub-find.gif docs/demo-core-8.gif
git commit -m "docs: add demo GIFs (teaser + full Core 8 walkthrough)"
git push -u origin docs/demo-assets-gif-real
```

Tell me the branch name (or the exact file paths) and I'll:
1. Uncomment the hero block in `README.md` and swap the placeholders to real paths.
2. Open the PR, squash-merge.
3. Verify the GIFs render at GitHub scale.

---

## Re-recording trigger

Re-record when:
- Bootstrap version bumps **minor or major** (e.g. v2.6.x → v2.7.0). Patches don't justify it.
- A command shown in the demo changes flags or output.
- The "Core N" mental model grows or shrinks (currently Core 8).

Archive the old GIFs to `docs/archive/<old-version>/` rather than deleting — old issue threads may still link to them.
