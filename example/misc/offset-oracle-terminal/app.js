// ---------- world generation ----------
function seededRng(seed) {
  let x = seed >>> 0;
  return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return (x >>> 0) / 4294967296; };
}

const state = {
  seed: 8131,
  segmentCount: 32,
  avgRecords: 1200,
  tombRatio: 0.18,
  snapEvery: 7,
  ringNodes: 8,
  vnodePerNode: 32,
  retentionHours: 168,
  storageCostGbPerHr: 0.02,
  replicaCount: 4,
  compactionCostMs: 350,
  dlqWindow: 12,
};

let segments = [], snapshots = [], dlq = [], ledger = [];

function regen() {
  const rng = seededRng(state.seed);
  segments = []; snapshots = []; dlq = []; ledger = [];
  let off = 0;
  for (let i = 0; i < state.segmentCount; i++) {
    const records = Math.floor(state.avgRecords * (0.5 + rng()));
    const tomb = Math.floor(records * state.tombRatio * (0.3 + rng() * 1.4));
    const seg = {
      id: "s" + i,
      idx: i,
      records,
      tomb,
      offsetStart: off,
      offsetEnd: off + records,
      sizeMB: Math.round(records * 0.08 + rng() * 40),
      snap: i % state.snapEvery === 0,
      hot: rng() < 0.2,
      compacted: rng() < 0.5 && i < state.segmentCount - 4,
      replicaId: "r" + (i % state.replicaCount),
    };
    segments.push(seg);
    if (seg.snap) snapshots.push({
      id: "snap-" + i, segId: seg.id, offset: off, ts: 3600_000 * i,
    });
    if (tomb > records * 0.4) {
      dlq.push({ id: "dlq-" + i, seg: seg.id, reason: "tomb-pressure",
        attempts: 1 + Math.floor(rng() * 4),
        status: rng() < 0.3 ? "poison" : "retry",
      });
    }
    off = seg.offsetEnd;
  }
  // ledger
  for (let t = 0; t < 22; t++) {
    const kind = t % 5 === 0 ? "leader" : (t % 3 === 0 ? "commit" : "append");
    ledger.push({
      term: 12 + Math.floor(t/6),
      offset: Math.floor(off * (t/22)),
      kind,
      who: "r" + (t % state.replicaCount),
    });
  }
}
regen();

// ---------- panel: scenario knobs ----------
function renderKnobs() {
  const root = d3.select("#knobs").html("");
  const knob = (label, key, min, max, step=1, hint="") => {
    const row = root.append("div").attr("class","knob");
    row.append("label").html(`${label} <b class="v-${key}">${state[key]}</b>`);
    row.append("input").attr("type","range")
      .attr("min",min).attr("max",max).attr("step",step)
      .property("value", state[key])
      .on("input", function() {
        state[key] = +this.value;
        d3.select(`.v-${key}`).text(state[key]);
        regen(); renderAll();
      });
    if (hint) row.append("div").attr("class","hint").text(hint);
  };
  knob("SEED","seed",1,99999,1,"fnv1a-xorshift determinism");
  knob("SEGMENTS","segmentCount",8,72,1,"timeline width");
  knob("AVG RECORDS","avgRecords",200,4000,50,"per segment");
  knob("TOMB RATIO","tombRatio",0.01,0.6,0.01,"delete markers per record");
  knob("SNAP EVERY","snapEvery",2,20,1,"snapshot cadence");
  knob("RING NODES","ringNodes",3,16,1,"consistent hash");
  knob("VNODES/NODE","vnodePerNode",4,128,1,"virtual placement");
  knob("RETENTION h","retentionHours",6,720,1,"retention window");
  knob("COST $/GB·h","storageCostGbPerHr",0.005,0.5,0.005);
  knob("REPLICAS","replicaCount",1,8,1);
  knob("COMPACTION ms","compactionCostMs",50,2000,10,"per compaction job");
  knob("DLQ WINDOW","dlqWindow",1,50,1,"tail depth shown");

  root.append("div").attr("class","readout")
    .html(`scenarios rebuild on-knob; baseline uses divide-by-zero-rate-guard.`);
}

// ---------- panel: segment graph ----------
let forceSim = null;
function renderGraph() {
  const svg = d3.select("#graph");
  const box = svg.node().getBoundingClientRect();
  const W = box.width, H = box.height;
  svg.attr("viewBox", `0 0 ${W} ${H}`).html("");
  const nodes = segments.map(s => ({ id: s.id, seg: s, kind: s.tomb/s.records > 0.4 ? "tomb" : s.snap ? "snap" : "seg" }));
  const links = [];
  for (let i = 1; i < nodes.length; i++) links.push({ source: nodes[i-1].id, target: nodes[i].id });
  snapshots.forEach((sn,i) => {
    if (i > 0) links.push({ source: "snap-"+((i-1)*state.snapEvery), target: "snap-"+(i*state.snapEvery) });
  });
  // snapshot ↔ seg
  snapshots.forEach(sn => { links.push({ source: sn.id, target: sn.segId }); });
  nodes.push(...snapshots.map(sn => ({ id: sn.id, kind: "snap", snap: sn })));

  const link = svg.append("g").selectAll("line").data(links).enter().append("line")
    .attr("class","link-line").attr("stroke-width",1);
  const node = svg.append("g").selectAll("circle").data(nodes).enter().append("circle")
    .attr("r", d => d.kind==="snap"?8:5)
    .attr("class", d => d.kind==="snap"?"node-snap": d.kind==="tomb"?"node-tomb":"node-seg");
  node.append("title").text(d => d.id);

  if (forceSim) forceSim.stop();
  forceSim = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(links).id(d=>d.id).distance(28).strength(0.3))
    .force("charge", d3.forceManyBody().strength(-55))
    .force("center", d3.forceCenter(W/2, H/2))
    .force("collide", d3.forceCollide().radius(10))
    .on("tick", () => {
      link.attr("x1", d=>d.source.x).attr("y1", d=>d.source.y)
          .attr("x2", d=>d.target.x).attr("y2", d=>d.target.y);
      node.attr("cx", d=>d.x).attr("cy", d=>d.y);
    });
}

// ---------- panel: offsets bars ----------
function renderOffsets() {
  const svg = d3.select("#offsets");
  const box = svg.node().getBoundingClientRect();
  const W = box.width, H = box.height;
  svg.attr("viewBox", `0 0 ${W} ${H}`).html("");
  const m = { top: 20, right: 12, bottom: 30, left: 48 };
  const x = d3.scaleLinear().domain([0, segments.length]).range([m.left, W - m.right]);
  const y = d3.scaleLinear()
    .domain([0, d3.max(segments, s => s.records)])
    .range([H - m.bottom, m.top]);
  svg.append("g").attr("class","axis")
    .attr("transform",`translate(0,${H - m.bottom})`)
    .call(d3.axisBottom(x).ticks(8));
  svg.append("g").attr("class","axis")
    .attr("transform",`translate(${m.left},0)`)
    .call(d3.axisLeft(y).ticks(6));

  const join = svg.append("g").selectAll("g.bar").data(segments, d => d.id);
  const enter = join.enter().append("g").attr("class","bar");
  enter.append("rect").attr("class","bar-live")
    .attr("x", (d,i)=>x(i)+1)
    .attr("width", Math.max(1, (x(1)-x(0)) - 2))
    .attr("y", d => y(d.records - d.tomb))
    .attr("height", d => H - m.bottom - y(d.records - d.tomb))
    .transition().duration(300);
  enter.append("rect").attr("class","bar-tomb")
    .attr("x", (d,i)=>x(i)+1)
    .attr("width", Math.max(1, (x(1)-x(0)) - 2))
    .attr("y", d => y(d.records))
    .attr("height", d => y(d.records - d.tomb) - y(d.records))
    .transition().duration(300);
  enter.append("circle")
    .attr("cx", (d,i) => x(i+0.5))
    .attr("cy", 10)
    .attr("r", d => d.snap ? 4 : 0)
    .attr("fill", "var(--warn)");
  join.exit().remove();

  svg.append("text").attr("x", m.left).attr("y", 14)
    .attr("fill","var(--muted)").attr("font-size",10)
    .text("live ▮ tomb ▮ snap ●  (scale = d3.scaleLinear)");
}

// ---------- panel: ROI histogram ----------
function renderROI() {
  const svg = d3.select("#roi");
  const box = svg.node().getBoundingClientRect();
  const W = box.width, H = box.height;
  svg.attr("viewBox", `0 0 ${W} ${H}`).html("");
  const m = { top: 18, right: 10, bottom: 30, left: 44 };
  const savings = segments.map(s => ({
    id: s.id,
    mb: Math.max(0, s.sizeMB * (s.tomb/s.records) - state.compactionCostMs/200),
  }));
  const x = d3.scaleBand().domain(savings.map(d=>d.id)).range([m.left, W-m.right]).padding(0.15);
  const y = d3.scaleLinear().domain([0, d3.max(savings,d=>d.mb)||1]).range([H-m.bottom, m.top]);
  svg.append("g").attr("class","axis").attr("transform",`translate(0,${H-m.bottom})`)
    .call(d3.axisBottom(x).tickValues(x.domain().filter((_,i)=>i%4===0)));
  svg.append("g").attr("class","axis").attr("transform",`translate(${m.left},0)`)
    .call(d3.axisLeft(y).ticks(5));
  svg.append("g").selectAll("rect").data(savings).enter().append("rect")
    .attr("class","bar-live")
    .attr("x", d=>x(d.id)).attr("y", d=>y(d.mb))
    .attr("width", x.bandwidth())
    .attr("height", d => H - m.bottom - y(d.mb))
    .append("title").text(d => `${d.id}: ${d.mb.toFixed(1)} MB reclaimed`);
  svg.append("text").attr("x", m.left).attr("y", 12)
    .attr("fill","var(--muted)").attr("font-size",10)
    .text("MB reclaimable per compaction (est.)");
}

// ---------- panel: consistent ring ----------
function renderRing() {
  const svg = d3.select("#ring");
  const box = svg.node().getBoundingClientRect();
  const W = box.width, H = box.height;
  const cx = W/2, cy = H/2, R = Math.min(W, H) * 0.42;
  svg.attr("viewBox", `0 0 ${W} ${H}`).html("");
  svg.append("circle").attr("cx",cx).attr("cy",cy).attr("r",R)
    .attr("fill","none").attr("stroke","var(--accent-dim)").attr("stroke-dasharray","3 3");
  const totalV = state.ringNodes * state.vnodePerNode;
  const colorScale = d3.scaleOrdinal(d3.schemeTableau10.map(c=>c)).domain(d3.range(state.ringNodes));
  // vnodes
  const vnodes = d3.range(totalV).map(i => {
    const node = i % state.ringNodes;
    const a = (i / totalV) * Math.PI * 2;
    return { a, node, x: cx + Math.cos(a)*R, y: cy + Math.sin(a)*R };
  });
  svg.append("g").selectAll("circle.v").data(vnodes).enter().append("circle")
    .attr("class","ring-vnode")
    .attr("cx", d=>d.x).attr("cy", d=>d.y).attr("r", 3)
    .attr("fill", d => colorScale(d.node))
    .attr("opacity", 0.7);
  // route some keys
  const keys = d3.range(8).map(i => {
    const a = (i / 8) * Math.PI * 2 + 0.35;
    return { a, r: R - 30, x: cx + Math.cos(a)*(R-30), y: cy + Math.sin(a)*(R-30) };
  });
  svg.append("g").selectAll("circle.k").data(keys).enter().append("circle")
    .attr("class","ring-key").attr("r",4)
    .attr("cx",d=>d.x).attr("cy",d=>d.y);
  keys.forEach(k => {
    // find nearest vnode clockwise
    const target = vnodes.find(v => ((v.a - k.a + Math.PI*2) % (Math.PI*2)) < 0.4) || vnodes[0];
    svg.append("line")
      .attr("x1",k.x).attr("y1",k.y)
      .attr("x2",target.x).attr("y2",target.y)
      .attr("stroke","var(--warn)")
      .attr("stroke-width",1).attr("stroke-opacity",0.6);
  });
  svg.append("text").attr("x",cx).attr("y",H-10)
    .attr("text-anchor","middle")
    .attr("fill","var(--muted)").attr("font-size",10)
    .text(`${state.ringNodes} nodes · ${state.vnodePerNode} vnodes each · minimal-key-movement diff`);
}

// ---------- panel: ledger ----------
function renderLedger() {
  const root = d3.select("#ledger").html("");
  const hdr = root.append("div").attr("class","ledger-row")
    .style("color","var(--muted)");
  hdr.append("span").text("term");
  hdr.append("span").text("offs");
  hdr.append("span").text("event");
  hdr.append("span").text("rep");
  ledger.forEach(l => {
    const row = root.append("div").attr("class","ledger-row " + l.kind);
    row.append("span").text("t" + l.term);
    row.append("span").text(l.offset.toLocaleString());
    row.append("span").text(l.kind === "leader" ? `⚑ elected ${l.who}` :
      l.kind === "commit" ? `✓ commit @${l.offset}` : `append @${l.offset}`);
    row.append("span").text(l.who);
  });
}

// ---------- panel: DLQ ----------
function renderDLQ() {
  const root = d3.select("#dlq").html("");
  const tail = dlq.slice(-state.dlqWindow);
  root.append("div").attr("class","dlq-row").style("color","var(--muted)")
    .html(`<span>#</span><span>attempts</span><span>reason</span><span>seg</span>`);
  tail.forEach((d,i) => {
    const row = root.append("div").attr("class","dlq-row " + d.status);
    row.append("span").text(i+1);
    row.append("span").text(d.attempts + "×");
    row.append("span").text(d.reason);
    row.append("span").text(d.seg);
  });
  if (tail.length === 0) {
    root.append("div").style("color","var(--muted)").style("font-style","italic")
      .text("[ no tombstones exceeded threshold — DLQ empty ]");
  }
}

// ---------- panel: retention cost ----------
function renderCalc() {
  const root = d3.select("#calc").html("");
  const totalMB = segments.reduce((a,s)=>a+s.sizeMB,0);
  const liveMB = segments.reduce((a,s)=>a + s.sizeMB * (1 - s.tomb/Math.max(1,s.records)), 0);
  const tombMB = totalMB - liveMB;
  const gbHr = (totalMB/1024) * state.retentionHours;
  const savedGbHr = (tombMB/1024) * state.retentionHours;
  const cost = gbHr * state.storageCostGbPerHr;
  const saved = savedGbHr * state.storageCostGbPerHr;
  const roiPct = cost === 0 ? 0 : Math.round((saved/cost)*100);

  const addRow = (l,v) => {
    const r = root.append("div").attr("class","calc-row");
    r.append("span").attr("class","l").text(l);
    r.append("span").attr("class","v").text(v);
  };
  addRow("segment count", segments.length);
  addRow("total size (MB)", totalMB.toLocaleString());
  addRow("live size (MB)", liveMB.toFixed(1));
  addRow("tombstone size (MB)", tombMB.toFixed(1));
  addRow("retention window (h)", state.retentionHours);
  addRow("retention GB·h", gbHr.toFixed(1));
  addRow("recoverable GB·h", savedGbHr.toFixed(1));
  addRow("unit cost ($/GB·h)", state.storageCostGbPerHr.toFixed(3));
  addRow("gross cost ($)", cost.toFixed(2));
  addRow("compaction saves ($)", saved.toFixed(2));
  root.append("div").attr("class","calc-total")
    .text(`ROI ≈ ${roiPct}% (guard: divide-by-zero-rate-guard)`);
}

// ---------- footer info ----------
const SKILLS = [
  "distributed-tracing-visualization-pattern","distributed-tracing-data-simulation",
  "time-series-db-visualization-pattern","time-series-db-data-simulation",
  "materialized-view-visualization-pattern","materialized-view-data-simulation",
  "database-sharding-visualization-pattern","database-sharding-data-simulation",
  "load-balancer-visualization-pattern","load-balancer-data-simulation",
  "rebalance-partition-ownership-swimlane","minimal-key-movement-rebalance-diff",
  "consistent-hashing-visualization-pattern","consistent-hashing-data-simulation",
  "consistent-hash-ring-virtual-node-placement",
  "dead-letter-queue-visualization-pattern","dead-letter-queue-data-simulation",
  "log-aggregation-visualization-pattern","log-aggregation-data-simulation",
  "raft-consensus-visualization-pattern","raft-consensus-data-simulation",
  "baseline-historical-comparison-threshold","divide-by-zero-rate-guard",
  "calendar-cron-vs-spring-cron-migration","tiered-rebalance-schedule",
  "backpressure-visualization-pattern","backpressure-data-simulation",
  "thread-pool-queue-backpressure","kafka-batch-consumer-partition-tuning",
  "watermark-aligned-window-emitter","lag-watermark-dual-axis-timeline",
  "event-sourcing-visualization-pattern","changelog-compaction-tombstone-retention",
  "bloom-filter-data-simulation","bloom-filter-visualization-pattern",
  "rolling-hash-chunk-boundary-detector","hybrid-logical-clock-merge",
  "lease-epoch-fencing-token-monotonic-guard","cache-variance-ttl-jitter",
  "mongo-ttl-with-aggregation-delta","availability-ttl-punctuate-processor",
  "outbox-pattern-visualization-pattern","saga-pattern-visualization-pattern",
  "idempotency-visualization-pattern","retry-strategy-visualization-pattern",
  "circuit-breaker-visualization-pattern","bulkhead-visualization-pattern",
  "schema-registry-visualization-pattern","service-mesh-visualization-pattern",
  "read-replica-visualization-pattern","object-storage-visualization-pattern",
];
const KNOWS = [
  "changelog-compaction-tombstone-retention",
  "event-sourcing-implementation-pitfall",
  "bloom-filter-false-positive-saturation-cliff",
  "token-range-ownership-requires-wrap-around-arc",
  "consistent-hashing-implementation-pitfall",
  "database-sharding-implementation-pitfall",
  "load-balancer-implementation-pitfall",
  "raft-consensus-implementation-pitfall",
  "materialized-view-implementation-pitfall",
  "dead-letter-queue-implementation-pitfall",
  "log-aggregation-implementation-pitfall",
  "backpressure-implementation-pitfall",
  "retry-strategy-implementation-pitfall",
  "circuit-breaker-implementation-pitfall",
  "bulkhead-implementation-pitfall",
  "idempotency-implementation-pitfall",
  "span-hash-determinism",
  "time-unit-consistency-us-ms-ns",
  "binsize-zero-fallback-to-one",
  "hub-scan-must-exclude-external-imports",
  "additive-registry-schema-versioning",
  "connection-pool-implementation-pitfall",
  "kafka-batch-size-timeout-tuning",
  "skip-schedule-if-previous-running",
  "quorum-visualization-off-by-one",
];
function renderFooter() {
  d3.select("#skills-list").html("").selectAll("code").data(SKILLS).enter().append("code").text(d=>d);
  d3.select("#know-list").html("").selectAll("code").data(KNOWS).enter().append("code").text(d=>d);
  d3.select("#sysinfo").html(`
    <div>mode: <b style="color:var(--accent)">forecast</b></div>
    <div>seed: <b style="color:var(--accent)">${state.seed}</b></div>
    <div>segs: ${segments.length} · snaps: ${snapshots.length} · dlq: ${dlq.length}</div>
    <div>replicas: ${state.replicaCount} · ring: ${state.ringNodes}×${state.vnodePerNode}</div>
    <div style="color:var(--muted);font-style:italic;margin-top:4px">
      every offset is a ledger, every tombstone a receipt.
    </div>
  `);
  d3.select("#status").text(`ready · ${segments.length} segments · ${snapshots.length} snapshots · ${dlq.length} dlq`);
}

function renderAll() {
  renderGraph(); renderOffsets(); renderROI(); renderRing();
  renderLedger(); renderDLQ(); renderCalc(); renderFooter();
}

// ---------- boot ----------
renderKnobs();
window.addEventListener("resize", renderAll);
renderAll();

// keyboard
window.addEventListener("keydown", (e) => {
  if (e.key === "r") { state.seed = Math.floor(Math.random()*99999); regen(); renderKnobs(); renderAll(); }
  if (e.key === "+") { state.segmentCount = Math.min(72, state.segmentCount + 4); regen(); renderKnobs(); renderAll(); }
  if (e.key === "-") { state.segmentCount = Math.max(8, state.segmentCount - 4); regen(); renderKnobs(); renderAll(); }
});