---
version: 0.1.0-draft
name: sidecar-proxy-implementation-pitfall
description: Common sidecar-proxy modeling mistakes that break the mental model and produce misleading metrics.
category: pitfall
tags:
  - sidecar
  - auto-loop
---

# sidecar-proxy-implementation-pitfall

The most frequent mistake is drawing traffic arrows directly between applications, treating the sidecar as a passive annotation. This collapses the whole value proposition — interception, policy enforcement, telemetry emission all happen *in* the sidecar. If users can't see that every byte crosses two sidecars, they won't understand why latency doubles, why mTLS works without app changes, or why a misconfigured filter takes down a service. Always route edges through the sidecar node explicitly, even at the cost of visual density.

A second pitfall is ignoring the control plane / data plane split. Simulations that apply config changes instantaneously hide the real-world bug class: config drift during xDS rollout, where half the sidecars have the new timeout and half don't. Your simulation must model propagation delay and show the transient mixed-state window, otherwise the config-lab teaches a dangerously simplified model. Similarly, don't forget that sidecars consume CPU and memory per pod — visualizations that show "free" proxying mislead capacity-planning intuition.

Third, retry and timeout semantics are easy to get subtly wrong. Retries happen at the *client-side sidecar*, not the server-side one, and timeouts compound across hops (if A→B has 1s timeout and B→C has 1s, A's effective budget for B is less than 1s). Circuit breakers trip on the outbound cluster of the caller's sidecar, not globally. Getting these wrong makes the traffic-sim produce numbers that contradict what operators see in production Istio/Linkerd/Consul, destroying trust in the tool.
