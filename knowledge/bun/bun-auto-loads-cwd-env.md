---
name: bun-auto-loads-cwd-env
summary: Bun unconditionally loads `.env`, `.env.local`, `.env.development`, `.env.production` from the CWD before user code runs — regardless of framework.
category: bun
confidence: high
tags: [bun, dotenv, process-env, gotcha]
source_type: extracted-from-git
source_url: https://github.com/coleam00/Archon.git
source_ref: dev
source_commit: d89bc767d291f52687beea91c9fcf155459be0d9
source_project: Archon
imported_at: 2026-04-18T00:00:00Z
linked_skills: [strip-cwd-env-boot]
---

# Bun Auto-Loads CWD `.env` (All Four Variants)

## Fact / Decision

Bun's runtime loads the following files, in this order, from `process.cwd()` **before any user code runs**:

1. `.env`
2. `.env.local`
3. `.env.development`
4. `.env.production`

Later files override earlier ones. This is built into the Bun runtime and happens regardless of whether your program calls `dotenv.config()`, uses a framework, or declares an entry-point guard.

Consequences for tools that are installed globally (or shipped as a compiled binary) and invoked with CWD inside a user's project:

- The user's project `.env` keys enter `process.env` before your CLI's first line runs.
- A subsequent `dotenv.config({ path: '/home/user/.tool/.env', override: true })` only overrides **keys that exist in both files**. Keys that exist only in the user project's `.env` (`DATABASE_URL`, `PORT`, `LOG_LEVEL`, `OPENAI_API_KEY`, …) survive and shadow your defaults.
- Even `dotenv.config({ processEnv: {} })` into a local object doesn't retroactively remove what Bun already injected.

The only reliable mitigation is to **actively delete** the leaked keys at the very top of the entry point, before any module reads `process.env` at init time.

## Why

Auto-loading is a DX feature — it makes `bun run script.ts` "just work" with a local `.env`. The cost is that there's no opt-out flag at the runtime level, and no way to tell Bun "only auto-load for this one shell invocation." For a distributed CLI, the correct posture is "assume the runtime did something, clean up at boot."

## Counter / Caveats

- This only bites when CWD is inside a user project. If your tool always sets its own CWD before reading config (e.g. `chdir(homedir + '/.tool')` in a wrapper script), the leak doesn't happen.
- Node.js (v20.6+) has its own `--env-file=` flag but it requires opt-in, so the leak doesn't happen on Node.
- The four filenames list may change with Bun version updates. Treat it as "whatever Bun documents today" rather than a fixed constant.

## Evidence

- `packages/paths/src/strip-cwd-env.ts`:27 — hardcoded list `['.env', '.env.local', '.env.development', '.env.production']` with comment "The four filenames Bun auto-loads from CWD (in loading order)."
- `packages/paths/src/strip-cwd-env.ts`:1-22 — rationale comment: "`override: true` in dotenv only fixes keys that exist in both files — keys that only appear in the target repo's .env survive unaffected. We strip them."
- Bun docs on `.env` files (referenced by Archon's implementation comment).
- Commit SHA: d89bc767d291f52687beea91c9fcf155459be0d9.
