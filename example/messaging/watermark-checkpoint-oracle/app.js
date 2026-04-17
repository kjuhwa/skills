/* Watermark Checkpoint Oracle — D3 v7
 * Terminal-green computational notebook for Kafka-style consumer-group systems.
 */

// -------- synthetic cluster model --------
const GROUPS = [
  { id: 'orders-aggregator', topic: 'orders.v1', partitions: 12, members: 4 },
  { id: 'ledger-projector',  topic: 'ledger.events', partitions: 8, members: 3 },
  { id: 'audit-sink',        topic: 'audit.log', partitions: 3, members: 2 },
  { id: 'metric-reducer',    topic: 'metrics.1m', partitions: 24, members: 6 },
];
const NODES = [];
const LINKS = [];

GROUPS.forEach((g) => {
  const groupNode = { id: g.id, kind: 'group', members: g.members, topic: g.topic, lag: 0 };
  NODES.push(groupNode);
  for (let i = 0; i < g.partitions; i++) {
    const pn = {
      id: `${g.topic}/${i}`, kind: 'partition', partition: i, group: g.id,
      hwm: 1000 + Math.random() * 50000,
      lso: 0,
      rate: 40 + Math.random() * 300,
      owner: (i % g.members),
      watermark: Date.now() - Math.random() * 120000,
      checkpoint: Date.now() - Math.random() * 60000,
    };
    pn.lso = pn.hwm - Math.random() * 12000;
    NODES.push(pn);
    LINKS.push({ source: g.id, target: pn.id });
  }
  // sidecar + proxy — sidecar-proxy-visualization-pattern
  const proxy = { id: g.id + '::sidecar', kind: 'sidecar', group: g.id };
  NODES.push(proxy);
  LINKS.push({ source: g.id, target: proxy.id });
});

// -------- time-series buffers --------
const LAG_SERIES = {};
GROUPS.forEach((g) => { LAG_SERIES[g.id] = []; });

// -------- LTTB downsample — time-series-db-visualization-pattern --------
function lttb(data, threshold) {
  if (threshold >= data.length || threshold === 0) return data;
  const sampled = [];
  const bucketSize = (data.length - 2) / (threshold - 2);
  let a = 0;
  sampled.push(data[a]);
  for (let i = 0; i < threshold - 2; i++) {
    const avgRangeStart = Math.floor((i + 1) * bucketSize) + 1;
    const avgRangeEnd = Math.min(data.length, Math.floor((i + 2) * bucketSize) + 1);
    let avgX = 0, avgY = 0;
    for (let j = avgRangeStart; j < avgRangeEnd; j++) { avgX += data[j][0]; avgY += data[j][1]; }
    const rangeCount = avgRangeEnd - avgRangeStart;
    avgX /= rangeCount; avgY /= rangeCount;
    const rangeOffs = Math.floor(i * bucketSize) + 1;
    const rangeTo = Math.floor((i + 1) * bucketSize) + 1;
    const pointAX = data[a][0], pointAY = data[a][1];
    let maxArea = -1, nextA = rangeOffs;
    for (let j = rangeOffs; j < rangeTo; j++) {
      const area = Math.abs(
        (pointAX - avgX) * (data[j][1] - pointAY)
      - (pointAX - data[j][0]) * (avgY - pointAY)
      ) * 0.5;
      if (area > maxArea) { maxArea = area; nextA = j; }
    }
    sampled.push(data[nextA]);
    a = nextA;
  }
  sampled.push(data[data.length - 1]);
  return sampled;
}

// -------- oracle computations --------
function oracleLagBudget(input) {
  const { thru, parts, cons, poll, proc, slo } = input;
  const partPerCons = parts / cons;
  const msgsPerConsPerSec = thru / cons;
  const processingPerBatch = poll * proc;                 // ms
  const batchesPerSec = 1000 / processingPerBatch;
  const throughputPerCons = batchesPerSec * poll;         // msg/s
  const headroom = throughputPerCons / msgsPerConsPerSec;
  const worstPollInterval = processingPerBatch * 1.2;     // ms + 20% variance
  const lagBuildupPerSec = Math.max(0, msgsPerConsPerSec - throughputPerCons);
  const sloHit = lagBuildupPerSec === 0 ? Infinity : (slo / lagBuildupPerSec);
  const verdict =
    headroom > 1.5 ? 'OK — 50%+ headroom'
    : headroom > 1.0 ? 'MARGINAL — tighten max-poll-records'
    : 'CRITICAL — consumers cannot keep up';
  return {
    partPerCons, msgsPerConsPerSec, processingPerBatch, batchesPerSec,
    throughputPerCons, headroom, worstPollInterval, lagBuildupPerSec, sloHit, verdict
  };
}

function oracleWatermark(input) {
  const { cp, ret, late } = input;
  const maxGap = cp + late;                  // seconds
  const cpPerHour = 3600 / cp;
  const retSeconds = ret * 3600;
  const cpWindow = retSeconds / cp;
  const cleanWmShift = late + cp * 0.5;      // drift allowance
  const verdict =
    cp * 4 < late ? 'OK — checkpoint dense vs lateness'
    : cp < late ? 'MARGINAL — increase checkpoint density'
    : 'CRITICAL — checkpoints wider than allowed lateness';
  return { maxGap, cpPerHour, cpWindow, cleanWmShift, verdict };
}

// -------- force graph — d3 --------
function renderGraph() {
  const svg = d3.select('#graph-svg');
  svg.selectAll('*').remove();
  const w = svg.node().clientWidth;
  const h = svg.node().clientHeight;

  const sim = d3.forceSimulation(NODES)
    .force('link', d3.forceLink(LINKS).id((d) => d.id).distance((l) => l.target.kind === 'sidecar' ? 45 : 70).strength(0.3))
    .force('charge', d3.forceManyBody().strength((d) => d.kind === 'group' ? -400 : -40))
    .force('center', d3.forceCenter(w / 2, h / 2))
    .force('collide', d3.forceCollide((d) => d.kind === 'group' ? 36 : 14));

  // grid backdrop — terminal aesthetic
  const g = svg.append('g').attr('class', 'grid');
  for (let x = 0; x < w; x += 40) g.append('line').attr('x1', x).attr('x2', x).attr('y1', 0).attr('y2', h).attr('stroke', '#0f1f0f').attr('stroke-width', 0.5);
  for (let y = 0; y < h; y += 40) g.append('line').attr('y1', y).attr('y2', y).attr('x1', 0).attr('x2', w).attr('stroke', '#0f1f0f').attr('stroke-width', 0.5);

  const linkSel = svg.selectAll('.link')
    .data(LINKS)
    .join('line')
    .attr('class', 'link');

  const nodeSel = svg.selectAll('.node')
    .data(NODES)
    .join('g')
    .attr('class', 'node')
    .call(d3.drag()
      .on('start', (event, d) => { if (!event.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
      .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; })
      .on('end', (event, d) => { if (!event.active) sim.alphaTarget(0); d.fx = null; d.fy = null; })
    );

  nodeSel.append('circle')
    .attr('r', (d) => d.kind === 'group' ? 22 : d.kind === 'sidecar' ? 7 : 6)
    .attr('fill', (d) => d.kind === 'group' ? 'transparent' : d.kind === 'sidecar' ? '#3f3f1f' : '#0a2a0a')
    .attr('stroke', (d) => d.kind === 'group' ? '#33ff33' : d.kind === 'sidecar' ? '#ffcc33' : '#1fbe1f')
    .attr('stroke-width', (d) => d.kind === 'group' ? 2 : 1);

  nodeSel.append('text')
    .attr('class', 'node-label')
    .attr('dy', (d) => d.kind === 'group' ? 4 : 14)
    .text((d) => d.kind === 'group' ? d.id : d.kind === 'sidecar' ? '≋' : 'p' + d.partition);

  sim.on('tick', () => {
    linkSel
      .attr('x1', (d) => d.source.x).attr('y1', (d) => d.source.y)
      .attr('x2', (d) => d.target.x).attr('y2', (d) => d.target.y);
    nodeSel.attr('transform', (d) => `translate(${d.x},${d.y})`);
  });

  // pulse links that fire events
  setInterval(() => {
    linkSel.each(function (d) {
      if (Math.random() < 0.05) {
        d3.select(this).classed('hot', true)
          .transition().duration(600).attr('stroke-opacity', 0.1)
          .on('end', function () { d3.select(this).classed('hot', false).attr('stroke-opacity', 0.6); });
      }
    });
  }, 220);
}

// -------- vector-clock concurrency matrix --------
function renderMatrix() {
  const svg = d3.select('#matrix-svg');
  svg.selectAll('*').remove();
  const w = svg.node().clientWidth;
  const h = svg.node().clientHeight;
  const side = Math.min(w, h) - 80;
  const n = 18;
  const cell = side / n;
  const g = svg.append('g').attr('transform', `translate(40, 40)`);

  const events = d3.range(n).map((i) => ({ id: i, clock: d3.range(n).map(() => Math.floor(Math.random() * 5)) }));
  // compute relation — concurrent-edit-merge-arbitration-table
  const rel = [];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) { rel.push({ i, j, r: 'self' }); continue; }
      let aLeB = true, bLeA = true;
      for (let k = 0; k < n; k++) {
        if (events[i].clock[k] > events[j].clock[k]) aLeB = false;
        if (events[j].clock[k] > events[i].clock[k]) bLeA = false;
      }
      rel.push({ i, j, r: aLeB && !bLeA ? 'before' : bLeA && !aLeB ? 'after' : 'concurrent' });
    }
  }
  const color = { self: '#0a0a0a', before: '#33ff33', after: '#1fbe1f', concurrent: '#ff55ff' };
  g.selectAll('rect').data(rel).join('rect')
    .attr('class', 'cell-rect')
    .attr('x', (d) => d.i * cell).attr('y', (d) => d.j * cell)
    .attr('width', cell - 0.5).attr('height', cell - 0.5)
    .attr('fill', (d) => color[d.r])
    .attr('opacity', 0)
    .transition().duration(700).delay((_, i) => i * 2)
    .attr('opacity', (d) => d.r === 'self' ? 1 : d.r === 'concurrent' ? 0.7 : 0.35);

  g.append('text').attr('class', 'matrix-label').attr('x', 0).attr('y', -8).text('vector-clock-concurrency-matrix · concurrent=magenta · happens-before=green');
  g.append('text').attr('class', 'matrix-label').attr('x', 0).attr('y', side + 14).text('events 0..17 · hybrid-logical-clock-merge compatible');
}

// -------- trace waterfall --------
function renderWaterfall() {
  const svg = d3.select('#waterfall-svg');
  svg.selectAll('*').remove();
  const w = svg.node().clientWidth;
  const h = svg.node().clientHeight;
  const spans = [];
  const N = 24;
  let t = 0;
  for (let i = 0; i < N; i++) {
    const dur = 20 + Math.random() * 400;
    spans.push({ id: i, start: t, dur, name: ['kafka.poll','consume','db.upsert','cache.get','emit','commit','bloom.check'][i % 7] + '@' + i, kind: i % 7 });
    t += Math.random() < 0.3 ? dur * 0.2 : 0;
  }
  const maxT = d3.max(spans, (d) => d.start + d.dur);
  const x = d3.scaleLinear().domain([0, maxT]).range([150, w - 30]);
  const y = d3.scaleBand().domain(spans.map((d) => d.id)).range([30, h - 30]).padding(0.3);

  svg.append('text').attr('x', 14).attr('y', 18).attr('class', 'matrix-label')
    .text('distributed-tracing-visualization-pattern · waterfall view · deterministic span ids via span-hash-determinism');

  svg.selectAll('rect.span').data(spans).join('rect')
    .attr('class', 'span')
    .attr('x', (d) => x(d.start))
    .attr('y', (d) => y(d.id))
    .attr('height', y.bandwidth())
    .attr('width', 0)
    .attr('fill', (d) => d3.interpolateRgb('#1fbe1f', '#33ffdd')(d.kind / 6))
    .attr('stroke', '#33ff33')
    .transition().duration(700).delay((_, i) => i * 30)
    .attr('width', (d) => x(d.start + d.dur) - x(d.start));

  svg.selectAll('text.span-label').data(spans).join('text')
    .attr('class', 'matrix-label')
    .attr('x', 10)
    .attr('y', (d) => y(d.id) + y.bandwidth() / 2 + 3)
    .text((d) => d.name);

  const ax = d3.axisBottom(x).ticks(6).tickFormat((d) => d + 'ms');
  svg.append('g').attr('class', 'axis').attr('transform', `translate(0, ${h - 28})`).call(ax);
}

// -------- lag time series — LTTB --------
function renderTimeseries() {
  const svg = d3.select('#timeseries-svg');
  svg.selectAll('*').remove();
  const w = svg.node().clientWidth;
  const h = svg.node().clientHeight;
  const margin = { top: 30, right: 20, bottom: 30, left: 60 };

  svg.append('text').attr('x', 14).attr('y', 18).attr('class', 'matrix-label')
    .text('time-series-db-visualization-pattern · LTTB downsample · lag msgs per consumer group');

  Object.keys(LAG_SERIES).forEach((gid) => {
    if (LAG_SERIES[gid].length === 0) {
      for (let i = 0; i < 220; i++) {
        const t = i;
        const v = Math.max(0,
          6000 + Math.sin(i * 0.1) * 2500
          + Math.sin(i * 0.03 + gid.length) * 1500
          + (Math.random() - 0.5) * 1200
          + (Math.random() < 0.01 ? 15000 : 0)
        );
        LAG_SERIES[gid].push([t, v]);
      }
    }
  });

  const all = [].concat(...Object.values(LAG_SERIES));
  const x = d3.scaleLinear().domain(d3.extent(all, (d) => d[0])).range([margin.left, w - margin.right]);
  const y = d3.scaleLinear().domain([0, d3.max(all, (d) => d[1]) * 1.1]).range([h - margin.bottom, margin.top]);

  svg.append('g').attr('class', 'axis').attr('transform', `translate(0, ${h - margin.bottom})`).call(d3.axisBottom(x).ticks(8));
  svg.append('g').attr('class', 'axis').attr('transform', `translate(${margin.left}, 0)`).call(d3.axisLeft(y).ticks(6).tickFormat((d) => (d / 1000).toFixed(0) + 'k'));

  const line = d3.line().x((d) => x(d[0])).y((d) => y(d[1])).curve(d3.curveMonotoneX);
  const palette = ['#33ff33', '#33ffdd', '#ffcc33', '#ff55ff'];
  Object.keys(LAG_SERIES).forEach((gid, i) => {
    const sampled = lttb(LAG_SERIES[gid], 80);
    svg.append('path')
      .attr('class', 'series-line')
      .attr('d', line(sampled))
      .attr('stroke', palette[i % palette.length])
      .attr('stroke-dasharray', (sampled.length > 0 ? (x(sampled[sampled.length - 1][0]) - x(sampled[0][0])) : 0))
      .attr('stroke-dashoffset', (sampled.length > 0 ? (x(sampled[sampled.length - 1][0]) - x(sampled[0][0])) : 0))
      .transition().duration(1200).delay(i * 200)
      .attr('stroke-dashoffset', 0);

    svg.append('text').attr('class', 'matrix-label')
      .attr('x', w - margin.right - 140).attr('y', margin.top + 14 + i * 14)
      .attr('fill', palette[i % palette.length]).text(gid);
  });
}

// -------- log heatmap — log-aggregation-visualization-pattern --------
function renderHeatmap() {
  const svg = d3.select('#heatmap-svg');
  svg.selectAll('*').remove();
  const w = svg.node().clientWidth;
  const h = svg.node().clientHeight;
  const cols = 48, rows = 16;
  const cw = (w - 60) / cols, ch = (h - 80) / rows;
  const sources = ['orders-aggregator','ledger-projector','audit-sink','metric-reducer','bloom-dedup','cdc-reader','outbox-relay','saga-coord','rebalance-ctrl','sidecar-east','sidecar-west','chaos-bench','canary-green','blue-prod','green-prod','strangler'];
  const data = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = Math.max(0, Math.sin(r * 0.4 + c * 0.2) * 0.4 + Math.random() * 0.8 + (c > 30 && r === 3 ? 1.4 : 0));
      data.push({ r, c, v, source: sources[r] });
    }
  }
  const color = d3.scaleLinear().domain([0, 0.5, 1.5]).range(['#0a0a0a', '#33ff33', '#ffcc33']);

  svg.append('text').attr('x', 14).attr('y', 18).attr('class', 'matrix-label')
    .text('log-aggregation-visualization-pattern · heatmap · burst source=orders-aggregator@col35 simulated');

  svg.selectAll('rect.h').data(data).join('rect')
    .attr('class', 'h')
    .attr('x', (d) => 60 + d.c * cw)
    .attr('y', (d) => 30 + d.r * ch)
    .attr('width', cw - 1)
    .attr('height', ch - 1)
    .attr('fill', '#0a0a0a')
    .transition().delay((d) => (d.r * cols + d.c) * 3).duration(500)
    .attr('fill', (d) => color(d.v));

  svg.selectAll('text.src').data(sources).join('text')
    .attr('class', 'matrix-label')
    .attr('x', 10).attr('y', (d, i) => 30 + i * ch + ch * 0.7)
    .text((d) => d);
}

// -------- pattern analytics cells — 24+ distributed patterns --------
const PATTERN_CELLS = [
  { k: 'blue·green ratio', skill: 'blue-green-deploy-data-simulation', fn: () => (Math.random() * 40 + 60).toFixed(0) + '%' },
  { k: 'canary pp', skill: 'canary-release-data-simulation', fn: () => (Math.random() * 10).toFixed(1) + 'pp' },
  { k: 'strangler coverage', skill: 'strangler-fig-data-simulation', fn: () => (Math.random() * 20 + 70).toFixed(0) + '%' },
  { k: 'chaos blast', skill: 'chaos-engineering-data-simulation', fn: () => Math.floor(Math.random() * 6) + ' nodes' },
  { k: 'bloom fpr', skill: 'bloom-filter-data-simulation', fn: () => (Math.random() * 0.8 + 0.1).toFixed(2) + '%' },
  { k: 'cdc lsn gap', skill: 'cdc-data-simulation', fn: () => Math.floor(Math.random() * 2000) + 'ms' },
  { k: 'etl batch rows', skill: 'etl-data-simulation', fn: () => (Math.random() * 800 + 100).toFixed(0) + 'k' },
  { k: 'mv staleness', skill: 'materialized-view-data-simulation', fn: () => (Math.random() * 5 + 0.5).toFixed(1) + 's' },
  { k: 'object s3 writes', skill: 'object-storage-data-simulation', fn: () => Math.floor(Math.random() * 900) + '/s' },
  { k: 'replica lag', skill: 'read-replica-data-simulation', fn: () => (Math.random() * 3).toFixed(2) + 's' },
  { k: 'graphql p95', skill: 'graphql-data-simulation', fn: () => (Math.random() * 200 + 40).toFixed(0) + 'ms' },
  { k: 'saga compensations', skill: 'saga-pattern-data-simulation', fn: () => Math.floor(Math.random() * 8) },
  { k: 'outbox backlog', skill: 'outbox-pattern-data-simulation', fn: () => Math.floor(Math.random() * 300) },
  { k: 'idempotency hits', skill: 'idempotency-data-simulation', fn: () => Math.floor(Math.random() * 50) + '/s' },
  { k: 'consistent hash', skill: 'consistent-hashing-data-simulation', fn: () => (Math.random() * 0.15).toFixed(3) + ' skew' },
  { k: 'sharding skew', skill: 'database-sharding-data-simulation', fn: () => (Math.random() * 0.20).toFixed(3) },
  { k: 'rebalance events', skill: 'consistent-hashing-data-simulation', fn: () => Math.floor(Math.random() * 4) + '/min' },
  { k: 'circuit trips', skill: 'circuit-breaker-data-simulation', fn: () => Math.floor(Math.random() * 3) },
  { k: 'retry budget used', skill: 'retry-strategy-data-simulation', fn: () => (Math.random() * 40).toFixed(0) + '%' },
  { k: 'bulkhead saturation', skill: 'bulkhead-data-simulation', fn: () => (Math.random() * 70).toFixed(0) + '%' },
  { k: 'backpressure signals', skill: 'backpressure-data-simulation', fn: () => Math.floor(Math.random() * 8) + '/s' },
  { k: 'rate-limit tokens', skill: 'rate-limiter-data-simulation', fn: () => Math.floor(Math.random() * 1000) },
  { k: 'conn pool in-use', skill: 'connection-pool-data-simulation', fn: () => Math.floor(Math.random() * 50) },
  { k: 'ws frames/s', skill: 'websocket-data-simulation', fn: () => Math.floor(Math.random() * 800) },
  { k: 'oauth refresh', skill: 'oauth-data-simulation', fn: () => Math.floor(Math.random() * 10) + '/min' },
  { k: 'quorum majority', skill: 'raft-consensus-data-simulation', fn: () => '2/3' },
  { k: 'actor mailbox', skill: 'actor-model-data-simulation', fn: () => Math.floor(Math.random() * 200) },
  { k: 'mesh policies', skill: 'service-mesh-data-simulation', fn: () => Math.floor(Math.random() * 40 + 10) },
  { k: 'sidecar latency', skill: 'sidecar-proxy-data-simulation', fn: () => (Math.random() * 1.2 + 0.3).toFixed(2) + 'ms' },
  { k: 'health flap', skill: 'health-check-data-simulation', fn: () => Math.floor(Math.random() * 4) + ' flips' },
  { k: 'api gw req', skill: 'api-gateway-pattern-data-simulation', fn: () => Math.floor(Math.random() * 5000) + '/s' },
  { k: 'schema evolutions', skill: 'schema-registry-data-simulation', fn: () => Math.floor(Math.random() * 6) + '/wk' },
  { k: 'api versions live', skill: 'api-versioning-data-simulation', fn: () => (1 + Math.floor(Math.random() * 4)) },
  { k: 'crdt merges', skill: 'crdt-data-simulation', fn: () => Math.floor(Math.random() * 40) + '/s' },
  { k: 'pubsub fan-out', skill: 'pub-sub-data-simulation', fn: () => Math.floor(Math.random() * 200) + ' subs' },
  { k: 'tracing orphans', skill: 'distributed-tracing-data-simulation', fn: () => Math.floor(Math.random() * 3) },
  { k: 'dlq msgs', skill: 'dead-letter-queue-data-simulation', fn: () => Math.floor(Math.random() * 50) },
  { k: 'event sourcing snap', skill: 'event-sourcing-data-simulation', fn: () => Math.floor(Math.random() * 10) + '/min' },
];

function renderPatternGrid() {
  const grid = d3.select('#pattern-grid');
  const cells = grid.selectAll('.metric-cell').data(PATTERN_CELLS, (d) => d.skill + d.k);
  const enter = cells.enter().append('div').attr('class', 'metric-cell');
  enter.append('div').attr('class', 'k').text((d) => d.k);
  enter.append('div').attr('class', 'v').text((d) => d.fn());
  enter.append('div').attr('class', 'delta').text((d) => d.skill);
  // update
  grid.selectAll('.metric-cell .v')
    .transition().duration(300)
    .tween('text', function (d) {
      const el = this;
      const next = d.fn();
      return () => { el.textContent = next; };
    });
}

// -------- quorum — raft-consensus-visualization-pattern --------
function renderQuorum() {
  const out = d3.select('#quorum-out');
  out.selectAll('*').remove();
  const clusters = [
    { name: 'controller quorum', n: 5, alive: 4 },
    { name: 'raft replicas', n: 3, alive: 3 },
    { name: 'byzantine ring', n: 7, alive: 5 },
  ];
  clusters.forEach((c) => {
    const needed = Math.floor((2 * c.n) / 3) + 1; // quorum-visualization-off-by-one
    const bar = out.append('div').attr('class', 'q-bar');
    const pct = (c.alive / c.n) * 100;
    bar.append('div').attr('class', 'q-fill').style('width', pct + '%');
    bar.append('div').attr('class', 'q-label').text(`${c.name} · ${c.alive}/${c.n} · need ${needed} · ${c.alive >= needed ? 'QUORUM' : 'NO QUORUM'}`);
  });
}

// -------- log tail --------
const LOG_BUF = [];
function pushLog(type, msg) {
  LOG_BUF.push({ type, msg, ts: new Date().toISOString().slice(11, 23) });
  if (LOG_BUF.length > 200) LOG_BUF.shift();
  const tail = d3.select('#log-tail');
  tail.selectAll('.line').remove();
  const recent = LOG_BUF.slice(-28);
  const lines = tail.selectAll('.line').data(recent);
  const en = lines.enter().append('div').attr('class', 'line');
  en.append('span').attr('class', 'ts').text((d) => d.ts);
  en.append('span').attr('class', (d) => 't ' + d.type).text((d) => d.type);
  en.append('span').text((d) => d.msg);
  tail.node().scrollTop = tail.node().scrollHeight;
}

// -------- oracle output renderers --------
function printOracle() {
  const input = {
    thru: +document.getElementById('in-thru').value,
    parts: +document.getElementById('in-parts').value,
    cons: +document.getElementById('in-cons').value,
    poll: +document.getElementById('in-poll').value,
    proc: +document.getElementById('in-proc').value,
    slo: +document.getElementById('in-slo').value,
  };
  const o = oracleLagBudget(input);
  const color = o.verdict.startsWith('OK') ? 'wm-oracle-ok'
              : o.verdict.startsWith('MARGINAL') ? 'wm-oracle-warn'
              : 'wm-oracle-err';
  const lines = [
    ['partitions / consumer',      o.partPerCons.toFixed(2)],
    ['msg/s / consumer',           o.msgsPerConsPerSec.toFixed(0)],
    ['processing ms / batch',      o.processingPerBatch.toFixed(2)],
    ['batches / s / consumer',     o.batchesPerSec.toFixed(2)],
    ['consumer throughput msg/s',  o.throughputPerCons.toFixed(0)],
    ['headroom factor',            o.headroom.toFixed(2) + '×'],
    ['worst-case poll interval ms', o.worstPollInterval.toFixed(1)],
    ['lag buildup msg/s',          o.lagBuildupPerSec.toFixed(0)],
    ['SLO breach in',              o.sloHit === Infinity ? '∞ (stable)' : o.sloHit.toFixed(1) + 's'],
  ];
  const html = lines.map(([k, v]) => `<div><span class="k">${k}</span><span class="v">${v}</span></div>`).join('')
    + `<div class="ascii-divider">════════════════════</div>`
    + `<div><span class="k">verdict</span><span class="${color}">${o.verdict}</span></div>`
    + `<div class="k" style="margin-top:6px">per kafka-batch-consumer-partition-tuning · kafka-batch-size-timeout-tuning</div>`;
  document.getElementById('oracle-output').innerHTML = html;

  // warn if partition/consumer < 1
  if (o.partPerCons < 1) {
    document.getElementById('warn-bar').textContent = '⚠ partitions < consumers — idle consumers predicted';
  } else if (o.headroom < 1) {
    document.getElementById('warn-bar').textContent = '⚠ lag will grow — rebalance inbound';
  } else {
    document.getElementById('warn-bar').textContent = '';
  }

  // watermark oracle
  const wmInput = {
    cp: +document.getElementById('in-cp').value,
    ret: +document.getElementById('in-ret').value,
    late: +document.getElementById('in-late').value,
  };
  const wm = oracleWatermark(wmInput);
  const wcolor = wm.verdict.startsWith('OK') ? 'wm-oracle-ok'
              : wm.verdict.startsWith('MARGINAL') ? 'wm-oracle-warn'
              : 'wm-oracle-err';
  const wmLines = [
    ['max gap s',              wm.maxGap.toFixed(1)],
    ['checkpoints / hour',     wm.cpPerHour.toFixed(1)],
    ['checkpoints in window',  wm.cpWindow.toFixed(0)],
    ['clean watermark shift',  wm.cleanWmShift.toFixed(1) + 's'],
  ];
  document.getElementById('wm-output').innerHTML =
    wmLines.map(([k, v]) => `<div><span class="k">${k}</span><span class="v">${v}</span></div>`).join('')
    + `<div class="ascii-divider">════════════════════</div>`
    + `<div><span class="k">verdict</span><span class="${wcolor}">${wm.verdict}</span></div>`
    + `<div class="k" style="margin-top:6px">per availability-ttl-punctuate-processor · realtime-vs-polling-fallback</div>`;
}

// -------- tab routing --------
function wireTabs() {
  d3.selectAll('.tab').on('click', function () {
    const v = this.dataset.view;
    d3.selectAll('.tab').classed('active', false);
    d3.select(this).classed('active', true);
    d3.selectAll('.view').classed('active', false);
    d3.select('#view-' + v).classed('active', true);
    if (v === 'graph') renderGraph();
    if (v === 'matrix') renderMatrix();
    if (v === 'waterfall') renderWaterfall();
    if (v === 'timeseries') renderTimeseries();
    if (v === 'heatmap') renderHeatmap();
  });
}

// -------- clock readout — hybrid-logical-clock-merge --------
let hlcWall = Date.now(), hlcLogic = 0;
function advanceHlc() {
  const now = Date.now();
  if (now > hlcWall) { hlcWall = now; hlcLogic = 0; } else { hlcLogic++; }
  document.getElementById('clock-readout').textContent =
    `HLC ${new Date(hlcWall).toISOString().slice(11, 19)}.${hlcLogic.toString().padStart(3, '0')}`;
}

// -------- live sim tick --------
function simTick() {
  // advance lag series
  Object.keys(LAG_SERIES).forEach((gid) => {
    const last = LAG_SERIES[gid][LAG_SERIES[gid].length - 1] || [0, 5000];
    const t = last[0] + 1;
    const v = Math.max(0,
      last[1] * 0.97
      + Math.sin(t * 0.1) * 500
      + (Math.random() - 0.5) * 800
      + (Math.random() < 0.005 ? 10000 : 0)
    );
    LAG_SERIES[gid].push([t, v]);
    if (LAG_SERIES[gid].length > 500) LAG_SERIES[gid].shift();
  });
  // log emission
  const emits = [
    () => pushLog('cdc',       'lsn advance partition=' + Math.floor(Math.random() * 24) + ' · cdc-data-simulation'),
    () => pushLog('outbox',    'dispatch event · outbox-pattern-data-simulation'),
    () => pushLog('trace',     'span closed · distributed-tracing-data-simulation'),
    () => pushLog('rebalance', 'ring rotation · consistent-hashing-data-simulation'),
    () => pushLog('watermark', 'punctuate · availability-ttl-punctuate-processor'),
  ];
  emits[Math.floor(Math.random() * emits.length)]();
  renderPatternGrid();
  advanceHlc();
  const activeTab = d3.select('.tab.active').attr('data-view');
  if (activeTab === 'timeseries') renderTimeseries();
  if (activeTab === 'heatmap' && Math.random() < 0.05) renderHeatmap();
}

// -------- boot --------
function boot() {
  wireTabs();
  document.getElementById('btn-run').addEventListener('click', printOracle);
  ['in-thru','in-parts','in-cons','in-poll','in-proc','in-slo','in-cp','in-ret','in-late'].forEach((id) => {
    document.getElementById(id).addEventListener('input', printOracle);
  });
  renderGraph();
  renderMatrix();
  renderWaterfall();
  renderTimeseries();
  renderHeatmap();
  renderPatternGrid();
  renderQuorum();
  printOracle();
  for (let i = 0; i < 10; i++) pushLog('cdc', 'seed ' + i);
  setInterval(simTick, 700);
  setInterval(renderQuorum, 5000);
  setInterval(advanceHlc, 300);
  // keyboard shortcuts
  window.addEventListener('keydown', (e) => {
    if (e.key >= '1' && e.key <= '5') {
      const tabs = ['graph','matrix','waterfall','timeseries','heatmap'];
      d3.select(`.tab[data-view="${tabs[+e.key - 1]}"]`).dispatch('click');
    }
    if (e.key === 'r') printOracle();
  });
}

document.addEventListener('DOMContentLoaded', boot);