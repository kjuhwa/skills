---
description: Build something creative using all installed skills and knowledge — auto-checks existing examples first to avoid duplication, then proposes, builds, tests, and offers to publish
argument-hint: [hint...]  (optional free-text steer — e.g. "dashboard", "cli", "visualizer")
---

# /make_something $ARGUMENTS

Open-ended creative build command. The user says *"make me something"* and you take the wheel — using every installed skill, every knowledge entry, and the current project context. This command exists so the behavior is **repeatable, discoverable, and non-duplicative**.

## Steps

1. **Check prior art — mandatory**
   - Invoke `/example_list` (cache auto-refreshed). Print the full table.
   - Load each slug + one-line summary into working memory.
   - If `$ARGUMENTS` is non-empty, flag any existing example whose title/stack/tags overlap — that's a **do-not-rebuild** signal.

2. **Inventory current session**
   - List installed skills: count by category from `~/.claude/skills-hub/registry.json` (or `/skills_list` output).
   - List knowledge categories from `.claude/knowledge/*/` if present.
   - Inspect cwd: is this a code project (`package.json`, `pom.xml`, `Cargo.toml`)? An empty workspace? A skill repo?

3. **Gap check — research missing skills/knowledge**
   - Compare the inventory from step 2 against what `$ARGUMENTS` (or the obvious candidate space if no args) will need: stack, patterns, libraries, domain concepts.
   - If critical skills or knowledge are **missing** (e.g., user asks for a "rust cli tool" but no rust skills installed; user wants a "kafka dashboard" but no kafka knowledge), STOP before generating candidates and fill the gap:
     - Name each gap as a short topic keyword (e.g. `rust cli argument parsing`, `kafka consumer lag metrics`).
     - For each gap, invoke `/skills_research "<topic>"` (one per gap, or batch related topics into a single call). Use `--depth=quick` when the gap is narrow, `--depth=standard` otherwise.
     - Summarize what got staged under `.skills-draft/` and `.knowledge-draft/`. Ask the user whether to publish (`/publish_all`) and sync (`/skills_sync`) before continuing, so the new skills/knowledge become active in this session.
     - If the user declines to publish, proceed with what's available but **note the limitation** in the candidate pitches in step 4.
   - If inventory already covers the space, skip research and move on — don't research for the sake of researching.
   - Re-inventory after publish+sync so step 4 candidates can cite the newly-available skills by name.

4. **Generate candidate ideas**
   - Produce **2–3 candidates** that (a) don't duplicate any existing `example/`, (b) exploit something genuinely present in the current skill/knowledge set, (c) are buildable in-session without external services.
   - For each: one-line pitch + stack + estimated file count + why-this-user-cares rationale.
   - Present as a numbered list. If `$ARGUMENTS` gives a clear steer, bias toward it but still list alternatives.

5. **Pick**
   - If the user supplied `$ARGUMENTS` with an obvious single target, confirm it and proceed.
   - Otherwise ask `AskUserQuestion` (or plain prompt) — one selection.

6. **Build**
   - Apply the relevant skills — cite them by name as you use them ("applying `skill-repo-bootstrap-architecture` for the directory layout…").
   - Keep the artifact self-contained when possible (zero-dep preferred, Node / HTML / single-binary).
   - Follow the user's CLAUDE.md / AGENTS.md rules (terse code, no gratuitous comments, no markdown docs unless load-bearing).
   - If mid-build a new gap surfaces (an unexpected library or pattern is needed), pause and re-run `/skills_research "<topic>"` for that narrow gap rather than guessing — same publish+sync loop as step 3.

7. **Verify**
   - Actually run it: start servers with `run_in_background`, curl endpoints, run `node --check` on scripts, open the HTML via fetch and diff the rendered HTML for key IDs.
   - Do **not** claim done on "it compiles" alone — exercise the golden path.

8. **Offer to publish**
   - Propose a slug (kebab-case from the title) + one-sentence `why`.
   - Ask: *"Add this to the skills-hub `example/` folder?"* — on YES, invoke `/example_add <slug> --title=… --why=… --stack=…`.
   - Capture the returned PR URL in the final summary.

9. **Summary**
   - What was built, where it lives locally, PR link (if published), how to re-run / rebuild.
   - If step 3 researched new skills/knowledge, list them too so the user knows what was learned along the way.
   - **Write a `README.md`** in the project root capturing:
     - Title, one-line purpose, stack, how to run.
     - A dedicated **"Learned during build"** section — only when step 3 (or mid-build) actually ran `/skills_research` — listing each newly-acquired skill/knowledge slug, its source keyword, and whether it was published (`/publish_all`) or left as draft in `.skills-draft/` / `.knowledge-draft/`.
     - If no research was run, omit the section entirely rather than writing "N/A".
     - If a `README.md` already exists, merge: preserve existing sections and insert/refresh only the "Learned during build" block.

## Rules

- **Never skip step 1.** Duplicate work is the main thing this command prevents.
- **Never skip step 3's gap check.** Building blind — using a stack with no skill/knowledge backing — produces generic AI-slop output. Research first, then build.
  - Exception: if the inventory clearly covers the candidate space, explicitly say "gap check: covered" and move on — the step still runs, it just short-circuits.
  - `--no-research` in `$ARGUMENTS` lets the user opt out for quick throwaways; log the decision and proceed.
- Prefer breadth over depth in step 4 — three different angles beats three variations of the same idea.
- When a candidate would require secrets/credentials, flag it and let the user accept explicitly.
- If the user says *"yolo"* or the argument list contains `--yolo`, skip step 5 (auto-pick candidate 1) and auto-publish the research drafts in step 3 via `/publish_all --yes` — but never skip step 1 or the gap check itself.
- If `example/` already contains a very similar artifact, offer to **extend** (PR into the existing slug) rather than create a new sibling.
- Size the creation to the session: a 3-file HTML tool beats a 30-file framework every time.
- Research budget: cap gap-check at **3 `/skills_research` invocations** per `/make_something` run to avoid endless prep — if more gaps exist, surface them in the summary as "deferred research" instead of blocking the build.
