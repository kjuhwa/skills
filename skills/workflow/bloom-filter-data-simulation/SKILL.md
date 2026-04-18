---

name: bloom-filter-data-simulation
description: Generating realistic workloads (usernames, collisions, concurrent inserts) to exercise bloom filter behavior end-to-end
category: workflow
triggers:
  - bloom filter data simulation
tags: [workflow, bloom, filter, data, simulation]
version: 1.0.0
---

# bloom-filter-data-simulation

To demo bloom filters meaningfully, simulate workloads that match the use case. For a username-check app, seed with a dictionary of 5-50k realistic handles (common names, l33t variants, short tokens) so query latency and false-positive rates reflect real registration patterns — random UUIDs hide the clustering behavior humans care about. For a collision-race demo, deliberately craft inputs whose hash outputs overlap on a small m, so users can witness a false positive being manufactured in real time rather than waiting for statistical luck.

Drive simulation from a deterministic PRNG seed (MulberryJS, seedrandom, or a linear-congruential generator) so that "Share this scenario" links reproduce the exact same bit pattern, insertions, and collisions. Expose a speed control (1x/10x/100x/max) and a pause button; batch inserts in requestAnimationFrame ticks rather than tight loops so the UI stays responsive and the bit-flip animations remain legible. For the race variant, interleave two or more insertion streams on different "workers" (setTimeout-scheduled tasks) sharing a single bit array, and log each bit-flip with a source-ID so the final collision can be traced back to which stream caused which bit.

Always pair the simulation with a ground-truth Set running alongside the bloom filter. Every false-positive event (bloom says "maybe", Set says "no") should be captured into an events log with timestamp, token, and the k bit indices — this log becomes the teaching artifact and the regression fixture.
