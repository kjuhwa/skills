# Scope-narrowing pattern for AI subagents

Parallel AI coding agents fabricate when under-specified. This pattern puts an experienced human at the front as orchestrator, so each subagent receives a tightly-bounded brief and operates in its own filesystem.

## When to use

- You're running multiple AI coding agents in parallel against the same repo.
- Agents drift off-task or fabricate connections to unrelated code.
- You want to keep senior judgment in the loop without it being a throughput bottleneck on the execution side.

## Steps

1. **Triage synchronously before dispatch.** Read each issue/ticket yourself, decide accept/defer/close. If you can't make that call from the existing data, you don't have enough context to brief a subagent.
2. **Curate the subagent brief.** Include: the specific failure, relevant file paths, acceptance tests, non-goals. Exclude project history, unrelated tickets, opinions.
3. **Isolate the filesystem.** Each subagent runs in its own git worktree (`git worktree add ../agent-N`) so parallel runs don't collide on branch, index, or working tree.
4. **Grant a scoped credential.** `gh auth` or a PAT with just the permissions the subagent needs (e.g., PR creation on one repo). No org-wide tokens.
5. **Run tests inside the worktree.** The subagent's "done" criterion is green tests in its worktree — not a passing CI on another branch.
6. **Review before merge.** Orchestrator reads the diff, not the agent's narration. The narration is optimized for the model, the diff is the ground truth.
7. **Kill and restart on drift.** If an agent starts asking meta questions, exploring unrelated code, or re-deriving the brief, terminate that worker rather than "negotiating" it back on task.

## Success criteria

- Each subagent session stays under a defined context budget (e.g., 50k tokens).
- Merged PRs hit the acceptance tests supplied in the brief — no scope creep.
- Two parallel agents modifying adjacent files never corrupt each other's worktree.
- The orchestrator's time-per-issue (triage + review) is lower than the time it would take to implement it themselves.

## Gotchas

- **The orchestrator is the bottleneck, not the LLM.** Throughput is capped by how fast the human can triage and review.
- **Context isolation beats "smart" prompts.** A small brief with exact file paths beats a long rich prompt with "read the codebase and figure it out."
- **No institutional learning between runs.** Subagents start fresh each time. Codify repeat lessons as check-lists the orchestrator applies during triage, not as growing per-agent prompts.
- **Senior skill erosion.** Over-delegating decomposition to the model eventually eats the skill that makes this pattern work in the first place. Junior devs need to practice triage, not just review.
- **The `gh` CLI is a leak point.** A subagent with `gh` can open issues, push branches, and comment on PRs in your name. Scope the token.

## Division of labor

Orchestrator (human):
- Issue analysis and triage
- Context curation per task
- Diff review before merge

Subagents (AI):
- Bounded implementation
- Tests and validation
- Commit and PR creation

## Source

- https://dev.to/nfrankel/experimenting-with-ai-subagents-pc7 — Nicolas Frankel, "Experimenting with AI subagents."
- Research lane: skills_research trend survey, 2026-04-16 window.
