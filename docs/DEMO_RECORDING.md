# Demo Recording Guide

How to re-record the README hero assets (Asciinema cast + short GIF). Follow this when releasing a major bootstrap version or when the demo drifts from current behaviour.

The two assets tell complementary stories:

| Asset | Length | Story | Where it plays |
|---|---|---|---|
| **Asciinema cast** | ~90 s | "The Core 8 in 90 seconds" — a guided tour through `/hub-find`, `/hub-suggest`, `/hub-install`, `/hub-list`, `/hub-doctor`. Terminal-heavy, text-first. | README hero (desktop browsers) |
| **GIF** | 20–25 s | "Discovery → Install" — the golden path from a user description to an installed skill. Silent, auto-loops. | README hero (mobile/GitHub preview) |

---

## Prerequisites

- A clean-ish Claude Code session so the screen isn't cluttered with unrelated commands.
- `~/.claude/skills-hub/` already installed and `hub-search`, `hub-precheck`, `hub-doctor` on `PATH` (run `hub-doctor` first — all checks should pass).
- Terminal font large enough to be readable at 640 px wide (smaller GitHub renders truncate). Suggested: **Consolas 14 pt**, window size **100×30**.
- Dark theme for contrast.

---

## Asset 1 — Asciinema cast (~90 s)

### Setup

Windows (Git Bash / WSL):
```bash
pip install asciinema
# Or via scoop: scoop install asciinema
```

Login once:
```bash
asciinema auth   # opens a browser, confirms with your GitHub account
```

### Shooting script

Record each command, wait for the output to fully render, pause ~1 second before typing the next one. Don't rush — the viewer needs time to read.

```bash
# Start recording
asciinema rec --title "skills-hub — Core 8 in 90 seconds" \
              --idle-time-limit 2 \
              demo.cast
```

Inside the recording:

```
# Clear, title card
clear
echo "# skills-hub v2.6.2 — Core 8 commands in 90 seconds"
echo ""

# ── Act 1 (0:00–0:15)  Discovery ──────────────────────────────────────
echo "# 1. Find — ranked search with KO↔EN synonyms"
hub-search "스프링 카프카" -n 3
# (show top 3: jwt-refresh-rotation-spring etc.)

# ── Act 2 (0:15–0:30)  Auto-suggest in a real task ────────────────────
echo ""
echo "# 2. Suggest — AI picks a skill for an implementation task"
# Simulate by running hub-search with task keywords
hub-search "JWT refresh token implement" -n 1
# (narrate: "when user says '구현해줘', AI auto-triggers this")

# ── Act 3 (0:30–0:45)  Install ────────────────────────────────────────
echo ""
echo "# 3. Install — pin a specific version"
# For the demo, just show the command without actually mutating state:
echo "$ /hub-install jwt-refresh-rotation-spring@1.0.0"
echo "  → installed to ~/.claude/skills/jwt-refresh-rotation-spring/"
echo "  → pinned: true"

# ── Act 4 (0:45–1:00)  List locally installed ─────────────────────────
echo ""
echo "# 4. List — see what you have"
echo "$ /hub-list --kind skills"
# Show real output if you have skills installed, or a mocked sample

# ── Act 5 (1:00–1:15)  Precheck + diff ────────────────────────────────
echo ""
echo "# 5. Precheck — lint + regen indexes before publish"
hub-precheck --skip-lint 2>&1 | tail -8

# ── Act 6 (1:15–1:30)  Doctor ─────────────────────────────────────────
echo ""
echo "# 6. Doctor — health check (11 checks including git hooks, PATH, …)"
echo "$ /hub-doctor"
echo "  [PASS]  1. Remote cache integrity"
echo "  [PASS]  7. Tools & bin installation (v2.5.0+)"
echo "  [PASS]  8. Git hooks"
echo "  [PASS]  9. Indexes freshness"
echo "  [PASS] 10. Shell PATH"
echo "  Summary: 11 passed"

# Closing card
echo ""
echo "# Full install: curl -fsSL https://raw.githubusercontent.com/kjuhwa/skills-hub/main/bootstrap/install.sh | bash"
```

Stop recording: `Ctrl-D` or `exit`.

### Upload

```bash
asciinema upload demo.cast
# → returns a URL like https://asciinema.org/a/XXXXXX
# Copy the numeric ID (XXXXXX)
```

Hand the numeric ID back — it plugs into the README hero.

### Common mistakes

- Typing too fast: viewers skip content. Use `--idle-time-limit=2` so pauses compress automatically.
- Terminal too small: text is truncated on GitHub mobile preview. Target 100 cols × 30 rows.
- Colors missing: set `TERM=xterm-256color` before recording for ANSI colours to survive.

---

## Asset 2 — GIF (20–25 s)

### Tool

Windows:
- **[ScreenToGif](https://www.screentogif.com/)** (recommended — free, direct `.gif` export with good compression)
- Alternative: **[cap.so](https://cap.so/)** (cloud-hosted, nicer UX)

Settings:
- Frame rate: **12 fps** (smooth but small file)
- Capture area: **terminal window only** (~800×480 pixels, trim before export)
- Duration cap: **25 s** (longer loses viewer attention in a README)

### Shooting script (GIF)

The GIF is the **golden path only** — silent, tight, loops cleanly. No titles, no multiple scenes.

Sequence (aim for ~20 s end-to-end):

```
[0.0 s]  Clean terminal prompt visible
[0.5 s]  Type:  hub-search "카프카 컨슈머 튜닝"
[3.5 s]  Output renders — top result highlighted
[6.0 s]  Type:  hub-install kafka-batch-consumer-partition-tuning
[9.0 s]  Output: "installed to ~/.claude/skills/..."
[11.0 s] Type:  hub-list --kind skills
[13.0 s] Output: shows the just-installed skill
[15.0 s] Type:  hub-doctor
[18.0 s] Output: "Summary: 11 passed"
[20.0 s] Pause 2 s so the last frame is readable
[22.0 s] End — loop back
```

### Export

- Save as: `docs/demo-hub-find.gif`
- Target size: ≤ 5 MB. If larger, drop framerate to 10 fps or crop tighter.
- Test at GitHub scale (640 px wide) before committing.

---

## Integration (I'll do this part)

Once you have both assets ready:

1. **Asciinema**: hand me the numeric ID (e.g. `723451`).
2. **GIF**: commit the file to `docs/demo-hub-find.gif` (or tell me the path).
3. I'll swap the `<!-- ASCIINEMA_ID -->` and `<!-- GIF_PATH -->` placeholders in the README hero block with the real values, open the PR, and merge.

---

## Re-recording trigger

Re-record the demo when:
- Bootstrap version bumps **minor or major** (e.g. v2.6.x → v2.7.0). Patches don't justify a re-record.
- A command shown in the demo changes flags or output format.
- The "Core N" mental model grows or shrinks (currently Core 8).

Keep the old assets in `docs/archive/` rather than deleting — old GIFs in issue threads still link to them.
