---
version: 0.1.0-draft
name: repeated-look-again-means-retract-not-escalate
description: Repeated "look again" from the user after multiple findings is a signal to retract over-reaching claims, not to propose more findings.
category: workflow
type: pitfall
tags:
  - collaboration
  - feedback-interpretation
  - self-correction
---

# Repeated "look again" means retract, not escalate

## The pitfall

When the user says "look again" / "다시 봐봐" a second or third time after you've already offered a list of findings, the instinct is to search HARDER — add another bullet, find one more defect, raise a new concern. That's usually wrong.

Multiple vague "look again" responses almost always mean: **"your analysis is off — narrow it down, don't expand it."** Escalating by producing MORE candidates compounds the original mistake (over-confident noise), because each new item was generated under the same faulty discrimination that produced the first set.

## What happened

Observed pattern in a real session:
1. User asks for a file review. Assistant offers 4 items of varying severity.
2. User: "다시 봐봐" (look again). Assistant proposes 2 more findings (one confessed retraction, one new "crash-inducing" bug based on a prompt-text contradiction).
3. User: "다시 봐봐" again. Assistant, now anxious, invents a fresh angle.
4. User: "다시 봐봐" again. Only then does the assistant retract everything except the ONE indisputable finding — a comment-vs-default mismatch — which had been the only real hit all along.

All the intermediate "findings" were speculative: ambiguous prose read as a JSON crash, environment-dependent bugs stated as definite, design preferences framed as bugs.

## What to do instead

- After the **second** "look again," stop proposing and start evaluating: which of your prior claims are **indisputable** (documented mismatch, a failing test, a provable crash), which are **inferential** (probable bug contingent on some env detail), and which are **preference** (a design improvement)?
- Respond by explicitly re-classifying your earlier claims into those three buckets. Retract the inferential and preference items unless the user asks for them specifically.
- Ask the user to point at the angle you're missing, rather than guessing at a new one.

## How to tell "look again" apart from "look deeper"

- "Look again" after vague or open-ended assistant output → usually "you're overreaching."
- "Look again at the error" / "look again at line 42" → localized "you missed something specific."
- If unsure, ask: "Are my current findings too broad, or am I missing something specific?"
