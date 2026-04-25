---
version: 0.1.0-draft
name: unreal-version
summary: Unreal Engine pinned version reference and knowledge gap registry for CCGS
category: engine
confidence: medium
tags: [game-studios, ccgs, unreal, versioning, engine-reference]
source_type: extracted-from-git
source_url: https://github.com/Donchitos/Claude-Code-Game-Studios.git
source_ref: main
source_commit: 666e0fcb5ad3f5f0f56e1219e8cf03d44e62a49a
source_project: Claude-Code-Game-Studios
source_path: docs/engine-reference/unreal/VERSION.md
imported_at: 2026-04-18T00:00:00Z
---

# Unreal Engine — Version Reference

| Field | Value |
|-------|-------|
| **Engine Version** | Unreal Engine 5.7 |
| **Release Date** | November 2025 |
| **Project Pinned** | 2026-02-13 |
| **Last Docs Verified** | 2026-02-13 |
| **LLM Knowledge Cutoff** | May 2025 |

## Knowledge Gap Warning

The LLM's training data likely covers Unreal Engine up to ~5.3. Versions 5.4, 5.5,
5.6, and 5.7 introduced significant changes that the model does NOT know about.
Always cross-reference this directory before suggesting Unreal API calls.

## Post-Cutoff Version Timeline

| Version | Release | Risk Level | Key Theme |
|---------|---------|------------|-----------|
| 5.4 | ~Mid 2025 | HIGH | Motion Design tools, animation improvements, PCG enhancements |
| 5.5 | ~Sep 2025 | HIGH | Megalights (millions of lights), animation authoring, MegaCity demo |
| 5.6 | ~Oct 2025 | MEDIUM | Performance optimizations, bug fixes |
| 5.7 | Nov 2025 | HIGH | PCG production-ready, Substrate production-ready, AI assistant |

## Major Changes from UE 5.3 to UE 5.7

### Breaking Changes
- **Substrate Material System**: New material framework (replaces legacy materials)
- **PCG (Procedural Content Generation)**: Production-ready, major API changes
- **Megalights**: New lighting system (millions of dynamic lights)
- **Animation Authoring**: New rigging and animation tools
- **AI Assistant**: In-editor AI guidance (experimental)

### New Features (Post-Cutoff)
- **Megalights**: Dynamic lighting at massive scale (millions of lights)
- **Substrate Materials**: Production-ready modular material system
- **PCG Framework**: Procedural world generation (production-ready in 5.7)
- **Enhanced Virtual Production**: MetaHuman integration, deeper VP workflows
- **Animation Improvements**: Better rigging, blending, procedural animation
- **AI Assistant**: In-editor AI help (experimental)

### Deprecated Systems
- **Legacy Material System**: Migrate to Substrate for new projects
- **Old PCG API**: Use new production-ready PCG API (5.7+)

## Verified Sources

- Official docs: https://docs.unrealengine.com/5.7/
- UE 5.7 release notes: https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-5-7-release-notes
- What's new in 5.7: https://dev.epicgames.com/documentation/en-us/unreal-engine/whats-new
- UE 5.7 announcement: https://www.unrealengine.com/en-US/news/unreal-engine-5-7-is-now-available
- UE 5.5 blog: https://www.unrealengine.com/en-US/blog/unreal-engine-5-5-is-now-available
- Migration guides: https://docs.unrealengine.com/5.7/en-US/upgrading-projects/
