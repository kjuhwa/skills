---
version: 0.1.0-draft
name: udp-for-throughput-tcp-for-reliability
summary: Scouter streams periodic metrics over UDP (lossy but cheap) and reserves TCP for config fetch, agent registration, and XLog profile uploads that demand delivery guarantees
category: decision
confidence: high
source_type: extracted-from-git
source_url: https://github.com/kjuhwa/scouter
source_ref: master
source_commit: 126bb19f07d1fe4fe915eb408c381e2c140cc94c
source_project: scouter
tags: [network, udp, tcp, decision, apm]
---

## Fact

UDP is chosen for the metric stream because agents push periodic updates (~5s cadence) and a dropped packet is overwritten by the next one — no retransmit, no stuck queue, minimal CPU. TCP is chosen for request/response traffic (agent asks for config, server responds; agent uploads a full XLog profile on drill-down request) where loss would mean missing data with no natural recovery. Multi-packet records (> MTU) use a custom MultiPacket / MultiPacketProcessor framing with sequence IDs.

## Evidence

- `scouter.document/main/Configuration.md` — ports / protocols documented
- `scouter.agent.batch/src/main/java/scouter/agent/batch/netio/data/net/UdpAgent.java`
- `scouter.agent.batch/src/main/java/scouter/agent/batch/netio/data/net/TcpAgentReqMgr.java`

## How to apply

Don't reach for "use Kafka / AMQP" when building an in-process observability agent. The overhead of a full broker or even durable TCP is wasteful for fire-and-forget counters. But *do* reach for TCP (or a queue) the moment the data has an at-least-once requirement — alert events, audit trails, billing metrics.
