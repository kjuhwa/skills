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

3. **Generate candidate ideas**
   - Produce **2–3 candidates** that (a) don't duplicate any existing `example/`, (b) exploit something genuinely present in the current skill/knowledge set, (c) are buildable in-session without external services.
   - For each: one-line pitch + stack + estimated file count + why-this-user-cares rationale.
   - Present as a numbered list. If `$ARGUMENTS` gives a clear steer, bias toward it but still list alternatives.

4. **Pick**
   - If the user supplied `$ARGUMENTS` with an obvious single target, confirm it and proceed.
   - Otherwise ask `AskUserQuestion` (or plain prompt) — one selection.

5. **Build**
   - Apply the relevant skills — cite them by name as you use them ("applying `skill-repo-bootstrap-architecture` for the directory layout…").
   - Keep the artifact self-contained when possible (zero-dep preferred, Node / HTML / single-binary).
   - Follow the user's CLAUDE.md / AGENTS.md rules (terse code, no gratuitous comments, no markdown docs unless load-bearing).

6. **Verify**
   - Actually run it: start servers with `run_in_background`, curl endpoints, run `node --check` on scripts, open the HTML via fetch and diff the rendered HTML for key IDs.
   - Do **not** claim done on "it compiles" alone — exercise the golden path.

7. **Offer to publish**
   - Propose a slug (kebab-case from the title) + one-sentence `why`.
   - Ask: *"Add this to the skills-hub `example/` folder?"* — on YES, invoke `/example_add <slug> --title=… --why=… --stack=…`.
   - Capture the returned PR URL in the final summary.

8. **Summary**
   - What was built, where it lives locally, PR link (if published), how to re-run / rebuild.

## Rules

- **Never skip step 1.** Duplicate work is the main thing this command prevents.
- Prefer breadth over depth in step 3 — three different angles beats three variations of the same idea.
- When a candidate would require secrets/credentials, flag it and let the user accept explicitly.
- If the user says *"yolo"* or the argument list contains `--yolo`, skip step 4 (auto-pick candidate 1) but never skip step 1.
- If `example/` already contains a very similar artifact, offer to **extend** (PR into the existing slug) rather than create a new sibling.
- Size the creation to the session: a 3-file HTML tool beats a 30-file framework every time.
