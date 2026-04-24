---
name: cli-release-accompanies-prod-deploy
summary: Every production deployment of the server must be accompanied by a matching CLI release, so server-CLI protocol changes never ship skewed.
category: decision
tags: [release, versioning, cli, server, protocol]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/multica-ai/multica.git
source_ref: main
source_commit: 6cd49e132de7632b1f2aaa675c98e8eca9308bb7
source_project: multica
source_path: CLAUDE.md
imported_at: 2026-04-18T00:00:00Z
---

Hard rule: a CLI release must accompany every production deployment. Default is a patch bump per release (`v0.1.12 → v0.1.13`) unless the change is larger.

## Why

CLI and server share a wire protocol (REST, WebSocket, task/message shapes). Deploying the server alone can break CLIs that users are already running; forcing a paired release keeps both sides in lockstep. The `multica update` command (and `brew upgrade`) lets users pull the new CLI, so the friction of staying current is low.

Even when the protocol is technically unchanged, cutting a CLI release keeps `multica version` reporting a commit that matches what's on the server for easier support triage ("what commit were you running when this happened?").

Automate the pairing: release pipeline refuses to deploy the server if the latest tag on main hasn't been published through the CLI release workflow.

## Evidence

- CLAUDE.md, "CLI Release" section — prerequisite explicitly stated.
