---
name: snmp-ifindex-not-stable
version: 0.1.0-draft
tags: [pitfall, snmp, ifindex, not, stable]
category: pitfall
summary: SNMP `ifIndex` can change across device reboot/reconfig — never use it as a stable identifier
source:
  kind: project
  ref: cygnus@cbb96a6dfff
confidence: high
---

# SNMP ifIndex Is Not Stable

## Fact
Network device `ifIndex` values may be reassigned after reboot, hot-swap, or interface reconfiguration. Treating `ifIndex` as a primary key causes interfaces to "swap identities" in history.

## Why
Per RFC 2863, `ifIndex` is only required to be stable within a single agent run; many devices renumber on reboot.

## How to apply
- Key interfaces by `ifName` / `ifDescr` + parent-device identity, not `ifIndex`.
- On each discovery pass, refresh the `ifName → ifIndex` map instead of trusting the last-seen value.
- When an `ifIndex` change is detected, migrate history records to the new index rather than creating a duplicate interface.
