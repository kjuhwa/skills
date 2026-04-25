---
version: 0.1.0-draft
name: git-workflow-issue-version-forensics
summary: For stale bug reports, verify whether the issue is still present by using `git log --until`/`--after` on the relevant file path and `git show <commit>:path` to view the code at the time the issue was filed — avoids wasting effort on already-fixed bugs.
category: git-workflow
tags: [git, debugging, issue-triage, forensics, blame, log, history]
source_type: extracted-from-git
source_url: https://github.com/aaddrick/claude-desktop-debian.git
source_ref: main
source_commit: 2fd9faf9db4eaa409b88310bdce397f8bdb0e916
source_project: claude-desktop-debian
imported_at: 2026-04-18T00:00:00Z
version_origin: extracted
confidence: medium
---

# Git Workflow: Issue Version Forensics

## Context

In active open-source projects, bug reports accumulate faster than they are
resolved. When a contributor (human or AI agent) picks up an older issue, there
is a real risk of:
- Spending time investigating a bug that was already fixed.
- Writing a fix that duplicates or conflicts with work already merged.
- Misdiagnosing a regression as the original bug.

The standard response to a stale issue ("can you still reproduce this?") adds
round-trip latency. A faster approach uses git history to determine the likely
state of the code at issue-creation time.

## Observation

Given an issue creation date and the path(s) of relevant files, git can answer
"what did this file look like when the issue was filed?" in seconds:

```bash
# Get the issue creation date (from your issue tracker CLI)
ISSUE_DATE="2025-08-23T08:48:35Z"

# Find the commit just before the issue was created
git log --oneline --until="$ISSUE_DATE" -1
# e.g.: abc1234 Fix tray icon selection

# View the file as it was at that commit
git show abc1234:path/to/relevant-file.sh

# Find all commits to the file AFTER the issue was created
# (these are candidates that may have fixed the issue)
git log --oneline --after="$ISSUE_DATE" -- path/to/relevant-file.sh
```

If the `git log --after` output includes commits with messages like "Fix X" or
"Add Y support" that match the issue description, the fix is likely already
merged. Reference the specific commit SHA in the issue comment when closing.

## Why it happens

Bug reports reference behavior that existed at a specific point in time. Active
projects continuously evolve, so the codebase at `HEAD` may have already
addressed the issue. Without checking history, you cannot tell whether you are
looking at the buggy state or the fixed state.

`git log --until` and `--after` are date filters that scope the log to a time
window. `git show <commit>:path` reads the file content from the object
database at that commit without touching the working tree.

## Practical implication

Adopt this as a first step in issue triage before diving into root-cause
analysis:

```bash
# Step 1: get issue creation timestamp from your project management tool
CREATED_AT=$(gh issue view $ISSUE_NUMBER --json createdAt -q .createdAt)

# Step 2: find the commit just before that timestamp
BASELINE=$(git log --oneline --until="$CREATED_AT" -1 --format="%H")
echo "Baseline commit: $BASELINE"

# Step 3: view the file at baseline
git show "$BASELINE:scripts/relevant-file.sh" | grep -A5 -B5 "keyword"

# Step 4: check for subsequent commits that touched the same file
git log --oneline --after="$CREATED_AT" -- scripts/relevant-file.sh
```

If changes to the file since the issue date address the problem:
- Close or label the issue with a reference to the fixing commit.
- If still reproducible, you have the exact baseline state to compare against
  for root-cause analysis.

This technique is especially valuable for AI-assisted development where an
agent might otherwise reanalyze and re-implement something already solved.

## Source reference

- `CLAUDE.md`: "Investigating Issues" section — exact bash commands with
  comments explaining the workflow, presented as a required step before working
  on older issues.
