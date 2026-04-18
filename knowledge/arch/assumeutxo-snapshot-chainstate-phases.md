---
version: 0.1.0-draft
name: assumeutxo-snapshot-chainstate-phases
summary: (Blockchain-specific) Multi-chainstate snapshot validation — active chainstate syncs from a trusted-but-unverified UTXO snapshot while a background chainstate validates the snapshot's base, with a phased state machine for clean cutover.
category: arch
tags: [blockchain, utxo, snapshot, bitcoin, phased-validation]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/bitcoin/bitcoin
source_ref: refs/remotes/origin/master
source_commit: edcf84c73abcad31346388a4b8712b38742801ce
source_project: bitcoin
source_kind: project
imported_at: 2026-04-15
note: Flagged during import as weakly-generalizable — the specific state machine is UTXO/blockchain-shaped. Kept for reference, not as a generic pattern.
---

# Assumeutxo: phased multi-chainstate snapshot validation

## Scope

This note is about Bitcoin Core's `assumeutxo` feature. The concrete state machine only applies to UTXO-shaped blockchains; it's retained as a **reference design** for trust-on-first-use problems where a faster-to-load snapshot must be validated in the background while the system is already operating on it.

## The phases

| Phase | Active chainstate | Background chainstate | Notes |
|---|---|---|---|
| Normal | IBD-syncing main | — | Single chainstate, initial sync. |
| Snapshot loaded | IBD-syncing main | loaded but inactive | Snapshot on disk, not yet primary. |
| Snapshot active | snapshot syncs to tip | validates from genesis toward snapshot base | Snapshot serves reads; background catches up silently. |
| Background hits base | snapshot syncs to tip | UTXO-set hash verified against snapshot | Trust promotion moment. |
| Restart | main (renamed from snapshot) | — | Cleanup, `chainstate_snapshot` directory renamed to `chainstate`; single chainstate resumes. |

The two chainstates share a single `BlockManager` so block data isn't duplicated on disk; only the UTXO indexes diverge.

## Why it's interesting beyond Bitcoin

The shape — "assume a snapshot, serve from it, verify in background, promote on match, repudiate on mismatch" — is a general trust-on-first-use pattern. The same phased approach applies to:

- large state-restore scenarios (a replicated system bootstrapping from a peer's snapshot),
- caching layers that need to serve while revalidating.

The blockchain-specific parts are: which hash identifies the snapshot, how the background chainstate advances, and what "tip" means. The phasing itself is generic.

## How to apply (cautiously)

If you need something like this, read the doc as a **worked example**, not a recipe — the state machine's correctness depends on invariants specific to blockchain consensus. Extract the skeleton (two states with a cutover gate, shared storage, trust-promotion event), re-derive the invariants for your domain.

## Evidence

- `doc/design/assumeutxo.md`
