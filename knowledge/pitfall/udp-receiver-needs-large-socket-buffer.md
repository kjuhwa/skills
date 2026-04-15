---
name: udp-receiver-needs-large-socket-buffer
description: UDP collectors behind Traefik/containers must raise SO_RCVBUF well above the 8KB default or drop packets under burst load
category: pitfall
source:
  kind: project
  ref: lucida-for-docker@30b0e77
confidence: high
---

# UDP receivers need SO_RCVBUF ≫ 8192

## Fact
The default UDP receive buffer on Linux/JVM sockets (8192 bytes, and some container stacks) is too small for agent-style telemetry bursts. Packets are silently dropped at the kernel level — no error at the app, just missing metrics. Raising the app-side `SO_RCVBUF` (e.g. to 65535 or higher) eliminates the loss.

## Evidence
- Commit `30b0e77`: `#118285 Fix : WPM UDP 수신 버퍼 크기 확장 (8192 → 65535)`.

## How to apply
- Any UDP receiver (syslog, SNMP trap, custom agent protocol) fronting N agents: size `SO_RCVBUF` to accommodate at least N × peak-burst × avg-pkt-size, not the default.
- Also raise kernel `net.core.rmem_max` on the host — the socket option is capped by the kernel max.
- Verify with `ss -unp` and `netstat -su | grep 'packet receive errors'`; the kernel counter is the ground truth.

## Counter / Caveats
Buffer size is a band-aid for bursty arrival patterns; sustained overload still drops packets. Pair with upstream sampling or backpressure when raw volume exceeds the collector's sustained throughput.
