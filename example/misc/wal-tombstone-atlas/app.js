const { useState, useEffect, useRef, useMemo, useCallback, memo } = React;

// ---------- seeded PRNG (FNV1a + xorshift) ----------
function seedFnv1a(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function mkRng(seed) {
  let x = seed || 1;
  return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) / 4294967296); };
}

// ---------- mock world: segments, tombstones, offsets ----------
function buildWorld(seedStr) {
  const rng = mkRng(seedFnv1a(seedStr));
  const segments = [];
  let offset = 0;
  for (let i = 0; i < 48; i++) {
    const records = 400 + Math.floor(rng() * 1800);
    const tombstones = Math.floor(records * (rng() * 0.35));
    const sizeMB = Math.floor(4 + rng() * 60);
    const createdAt = Date.now() - (48 - i) * 3600_000 + Math.floor(rng() * 1200_000);
    const compacted = i < 30 && rng() > 0.4;
    const snapshot = i % 7 === 0;
    segments.push({
      id: `seg-${String(i).padStart(4, "0")}`,
      index: i,
      firstOffset: offset,
      lastOffset: offset + records - 1,
      records,
      tombstones,
      sizeMB,
      createdAt,
      compacted,
      snapshot,
      retentionJitterPct: Math.round((rng() * 20) - 10),
      replica: ["r-alpha","r-bravo","r-charlie","r-delta"][Math.floor(rng()*4)],
    });
    offset += records;
  }
  return { segments, totalOffset: offset, generatedAt: Date.now(), seed: seedStr };
}

function buildReplicaTimeline(world) {
  const replicas = ["r-alpha","r-bravo","r-charlie","r-delta"];
  return replicas.map((r, idx) => ({
    id: r,
    lag: Math.round(Math.sin(idx * 1.3) * 400 + 800),
    watermark: world.totalOffset - Math.floor(200 + idx * 130),
    epoch: 12 + idx,
    events: world.segments.filter(s => s.replica === r).map(s => ({
      offset: s.firstOffset, kind: s.snapshot ? "snap" : (s.compacted ? "cmp" : "apl"),
      seg: s.id
    })),
  }));
}

// ---------- visual primitives ----------
const SegmentTimeline = memo(function SegmentTimeline({ segments, cursor, onPick }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d");
    const W = c.width = c.clientWidth * devicePixelRatio;
    const H = c.height = 260 * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);
    ctx.clearRect(0, 0, c.clientWidth, 260);
    // grid
    ctx.strokeStyle = "#0d1e3a"; ctx.lineWidth = 1;
    for (let g = 0; g < 12; g++) {
      const x = (g / 12) * c.clientWidth;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 260); ctx.stroke();
    }
    // segment bars
    const W2 = c.clientWidth; const pad = 8;
    const barW = (W2 - pad * 2) / segments.length - 2;
    segments.forEach((s, i) => {
      const x = pad + i * (barW + 2);
      const liveRatio = 1 - (s.tombstones / s.records);
      const liveH = 160 * liveRatio;
      // live portion
      ctx.fillStyle = s.compacted ? "#00d4ff" : "#4e7bb5";
      ctx.fillRect(x, 200 - liveH, barW, liveH);
      // tombstone portion
      ctx.fillStyle = "#ff7eb6";
      ctx.fillRect(x, 200 - 160, barW, 160 - liveH);
      // snapshot marker
      if (s.snapshot) {
        ctx.fillStyle = "#5cffb1";
        ctx.fillRect(x, 208, barW, 4);
      }
      // cursor
      if (i === cursor) {
        ctx.strokeStyle = "#f0f6ff"; ctx.lineWidth = 2;
        ctx.strokeRect(x - 1, 200 - 160 - 1, barW + 2, 162);
      }
      // size sparkline
      ctx.fillStyle = "#0088aa";
      ctx.fillRect(x, 220, barW, s.sizeMB * 0.4);
    });
    // labels
    ctx.fillStyle = "#6b7a99"; ctx.font = "10px monospace";
    ctx.fillText("live ▮ tombstone ▮ snap ▬", 10, 252);
    ctx.fillText(`segments: ${segments.length}`, c.clientWidth - 130, 252);
  }, [segments, cursor]);
  const click = (e) => {
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const idx = Math.floor(((x - 8) / (rect.width - 16)) * segments.length);
    if (idx >= 0 && idx < segments.length) onPick(idx);
  };
  return <canvas className="timeline-canvas" ref={ref} onClick={click} style={{ height: 260 }} />;
});

const RetentionHeatmap = memo(function RetentionHeatmap({ segments }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d");
    c.width = c.clientWidth * devicePixelRatio;
    c.height = 180 * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);
    ctx.clearRect(0, 0, c.clientWidth, 180);
    const cols = 24, rows = 8;
    const cellW = c.clientWidth / cols;
    const cellH = 160 / rows;
    for (let r = 0; r < rows; r++) {
      for (let col = 0; col < cols; col++) {
        const idx = (r * cols + col) % segments.length;
        const s = segments[idx];
        const ratio = s.tombstones / s.records;
        const hue = 190 - ratio * 140;
        const light = 25 + ratio * 40;
        ctx.fillStyle = `hsl(${hue},80%,${light}%)`;
        ctx.fillRect(col * cellW + 1, r * cellH + 1, cellW - 2, cellH - 2);
      }
    }
    ctx.fillStyle = "#6b7a99"; ctx.font = "10px monospace";
    ctx.fillText("retention density × tombstone pressure", 6, 174);
  }, [segments]);
  return <canvas className="heatmap-canvas" ref={ref} style={{ height: 180 }} />;
});

const OffsetIndex = memo(function OffsetIndex({ segments, scrubberOffset }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d");
    c.width = c.clientWidth * devicePixelRatio;
    c.height = 140 * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);
    ctx.clearRect(0, 0, c.clientWidth, 140);
    // scaled offset band
    const total = segments[segments.length - 1].lastOffset;
    ctx.fillStyle = "#0b1633"; ctx.fillRect(0, 40, c.clientWidth, 40);
    segments.forEach((s, i) => {
      const x = (s.firstOffset / total) * c.clientWidth;
      const w = ((s.lastOffset - s.firstOffset) / total) * c.clientWidth;
      ctx.fillStyle = s.compacted ? "#00d4ff66" : "#4e7bb566";
      ctx.fillRect(x, 40, w, 40);
      if (s.snapshot) {
        ctx.strokeStyle = "#5cffb1"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x, 35); ctx.lineTo(x, 85); ctx.stroke();
      }
    });
    // cursor
    const cx = (scrubberOffset / total) * c.clientWidth;
    ctx.strokeStyle = "#f0f6ff"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx, 20); ctx.lineTo(cx, 100); ctx.stroke();
    ctx.fillStyle = "#f0f6ff"; ctx.font = "11px monospace";
    ctx.fillText(`offset @ ${scrubberOffset}`, cx + 4, 18);
    // LTTB-like downsample hint
    ctx.fillStyle = "#6b7a99"; ctx.font = "10px monospace";
    ctx.fillText("global offset index (compacted | raw | snapshot ▮)", 4, 130);
  }, [segments, scrubberOffset]);
  return <canvas className="offset-canvas" ref={ref} style={{ height: 140 }} />;
});

const ReplicaSwimlane = memo(function ReplicaSwimlane({ replicas, totalOffset }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d");
    c.width = c.clientWidth * devicePixelRatio;
    c.height = 220 * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);
    ctx.clearRect(0, 0, c.clientWidth, 220);
    const laneH = 50;
    replicas.forEach((r, i) => {
      const y = i * laneH + 20;
      ctx.fillStyle = "#0b1633"; ctx.fillRect(0, y, c.clientWidth, laneH - 10);
      ctx.fillStyle = "#6b7a99"; ctx.font = "10px monospace";
      ctx.fillText(r.id + "  ep=" + r.epoch + "  lag=" + r.lag, 6, y + 14);
      r.events.forEach(ev => {
        const x = (ev.offset / totalOffset) * c.clientWidth;
        ctx.fillStyle = ev.kind === "snap" ? "#5cffb1" :
                        ev.kind === "cmp" ? "#00d4ff" : "#ff7eb6";
        ctx.fillRect(x - 1, y + 20, 3, 14);
      });
      // watermark
      const wm = (r.watermark / totalOffset) * c.clientWidth;
      ctx.strokeStyle = "#00d4ff"; ctx.setLineDash([3,3]);
      ctx.beginPath(); ctx.moveTo(wm, y); ctx.lineTo(wm, y + laneH - 10); ctx.stroke();
      ctx.setLineDash([]);
    });
    // causal arrow
    ctx.strokeStyle = "#f0a050"; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(80, 40); ctx.quadraticCurveTo(c.clientWidth/2, 200, c.clientWidth - 120, 170);
    ctx.stroke();
    ctx.fillStyle = "#f0a050"; ctx.font = "10px monospace";
    ctx.fillText("hybrid logical clock → replay", 120, 210);
  }, [replicas, totalOffset]);
  return <canvas className="ring-canvas" ref={ref} style={{ height: 220 }} />;
});

// ---------- side tools ----------
function useReplayLog(world, cursor) {
  return useMemo(() => {
    const out = [];
    for (let i = Math.max(0, cursor - 8); i <= cursor && i < world.segments.length; i++) {
      const s = world.segments[i];
      out.push({
        ts: new Date(s.createdAt).toISOString().slice(11, 19),
        msg: `${s.id} rec=${s.records} tomb=${s.tombstones} size=${s.sizeMB}MB`,
        kind: s.compacted ? "ok" : (s.tombstones / s.records > 0.25 ? "err" : ""),
      });
    }
    return out;
  }, [world, cursor]);
}

function App() {
  const [seed, setSeed] = useState("wal-atlas-2026");
  const world = useMemo(() => buildWorld(seed), [seed]);
  const [cursor, setCursor] = useState(32);
  const [view, setView] = useState("overview");
  const [scrubberOffset, setScrubberOffset] = useState(world.totalOffset / 2 | 0);
  useEffect(() => { setScrubberOffset(world.totalOffset / 2 | 0); setCursor(Math.min(32, world.segments.length - 1)); }, [world]);
  const replicas = useMemo(() => buildReplicaTimeline(world), [world]);
  const seg = world.segments[cursor];
  const replayLog = useReplayLog(world, cursor);

  // keyboard shortcut
  useEffect(() => {
    const h = (e) => {
      if (e.key === "ArrowRight") setCursor(c => Math.min(world.segments.length - 1, c + 1));
      if (e.key === "ArrowLeft") setCursor(c => Math.max(0, c - 1));
      if (e.key === "r") setSeed("wal-" + Math.random().toString(36).slice(2,8));
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [world]);

  const totalTomb = useMemo(() =>
    world.segments.reduce((a,b)=>a+b.tombstones,0), [world]);
  const totalLive = useMemo(() =>
    world.segments.reduce((a,b)=>a+(b.records-b.tombstones),0), [world]);
  const compacted = world.segments.filter(s=>s.compacted).length;
  const snapshotCount = world.segments.filter(s=>s.snapshot).length;

  return (
    <div className="app-shell">
      <div className="topbar">
        <h1>WAL · Tombstone · Atlas</h1>
        <span className="pill">seed: {seed}</span>
        <span className="pill">offsets: {world.totalOffset.toLocaleString()}</span>
        <div className="spacer" />
        <span className="stat">live <b>{totalLive.toLocaleString()}</b></span>
        <span className="stat">tomb <b>{totalTomb.toLocaleString()}</b></span>
        <span className="stat">snaps <b>{snapshotCount}</b></span>
        <span className="stat">cmp <b>{compacted}</b></span>
        <button className="btn" style={{marginLeft:14}} onClick={()=>setSeed("wal-" + Math.random().toString(36).slice(2,8))}>
          reseed
        </button>
      </div>

      <div className="sidebar">
        <h2>Views</h2>
        <ul>
          {["overview","segments","offset-index","replicas","compaction","snapshots","tombstone","forensics"]
            .map(v => (
              <li key={v} className={view===v?"active":""} onClick={()=>setView(v)}>
                {v}
              </li>
            ))}
        </ul>
        <h2>Snapshots</h2>
        <div className="seg-row">
          {world.segments.filter(s=>s.snapshot).map(s=>(
            <span className="seg-chip active" key={s.id} onClick={()=>setCursor(s.index)}>{s.id}</span>
          ))}
        </div>
        <h2>Hot Tombstones</h2>
        <div className="seg-row">
          {[...world.segments].sort((a,b)=>b.tombstones-a.tombstones).slice(0,8).map(s=>(
            <span className="seg-chip tomb" key={s.id} onClick={()=>setCursor(s.index)}>{s.id}</span>
          ))}
        </div>
        <div className="footer-note">
          ← / → seeks cursor. <br/>
          r reseeds world.<br/>
          Inspired by compaction + snapshot patterns.
        </div>
      </div>

      <div className="main">
        <div className="metric-grid">
          <div className="metric-card">
            <div className="val">{seg.records}</div>
            <div className="lbl">records · {seg.id}</div>
          </div>
          <div className="metric-card">
            <div className="val">{seg.tombstones}</div>
            <div className="lbl">tombstones</div>
          </div>
          <div className="metric-card">
            <div className="val">{seg.sizeMB}<small style={{fontSize:11,color:"#6b7a99"}}>MB</small></div>
            <div className="lbl">segment size</div>
          </div>
          <div className="metric-card">
            <div className="val">{seg.retentionJitterPct}%</div>
            <div className="lbl">ttl jitter</div>
          </div>
        </div>
        <div className="panel">
          <h3>Segment Timeline</h3>
          <SegmentTimeline segments={world.segments} cursor={cursor} onPick={setCursor} />
          <div className="inline-legend">
            <span><span className="legend-swatch" style={{background:"#00d4ff"}}></span>compacted</span>
            <span><span className="legend-swatch" style={{background:"#4e7bb5"}}></span>live</span>
            <span><span className="legend-swatch" style={{background:"#ff7eb6"}}></span>tombstone</span>
            <span><span className="legend-swatch" style={{background:"#5cffb1"}}></span>snapshot</span>
          </div>
        </div>
        <div className="panel">
          <h3>Global Offset Index</h3>
          <OffsetIndex segments={world.segments} scrubberOffset={scrubberOffset} />
          <input type="range" className="scrubber" min={0}
            max={world.totalOffset} value={scrubberOffset}
            onChange={e=>setScrubberOffset(+e.target.value)} />
          <div className="subtle">Scrubbing an offset; use ArrowKeys for segment cursor.</div>
        </div>
        <div className="row">
          <div className="panel">
            <h3>Tombstone Retention Heatmap</h3>
            <RetentionHeatmap segments={world.segments} />
            <div className="subtle">Higher pressure → push compaction earlier.</div>
          </div>
          <div className="panel">
            <h3>Replica Swimlanes</h3>
            <ReplicaSwimlane replicas={replicas} totalOffset={world.totalOffset} />
          </div>
        </div>
      </div>

      <div className="aside">
        <div className="panel">
          <h3>Segment Detail</h3>
          <div className="subtle">id</div><div><b style={{color:"var(--accent)"}}>{seg.id}</b></div>
          <div className="subtle" style={{marginTop:6}}>offset range</div>
          <div>{seg.firstOffset.toLocaleString()} → {seg.lastOffset.toLocaleString()}</div>
          <div className="subtle" style={{marginTop:6}}>replica</div>
          <div>{seg.replica} &nbsp; <span className="tag">ep={12 + (seg.index%4)}</span></div>
          <div className="subtle" style={{marginTop:6}}>flags</div>
          <div>
            {seg.compacted && <span className="tag ok">compacted</span>}
            {seg.snapshot && <span className="tag ok">snapshot</span>}
            {(seg.tombstones/seg.records)>0.25 && <span className="tag warn">tomb-heavy</span>}
            {seg.retentionJitterPct>5 && <span className="tag">jittered</span>}
          </div>
        </div>
        <div className="panel">
          <h3>Replay Log</h3>
          {replayLog.map((l,i)=>(
            <div key={i} className={"log-line " + (l.kind||"")}>
              <span className="ts">{l.ts}</span>{l.msg}
            </div>
          ))}
        </div>
        <div className="panel">
          <h3>Fencing &amp; Watermark</h3>
          {replicas.map(r => (
            <div key={r.id} className="log-line">
              <span className="ts">{r.id}</span>
              wm={r.watermark.toLocaleString()} · ep={r.epoch} · lag={r.lag}
            </div>
          ))}
        </div>
      </div>

      <div className="bottombar">
        <div className="bottom-card">
          <h4>Skills applied</h4>
          <div className="subtle" style={{fontSize:10,lineHeight:1.5}}>
            <code>changelog-compaction-tombstone-retention</code>,
            <code>event-sourcing-visualization-pattern</code>,
            <code>event-sourcing-data-simulation</code>,
            <code>cdc-visualization-pattern</code>,
            <code>cdc-data-simulation</code>,
            <code>audit-change-data-capture-pattern</code>,
            <code>watermark-aligned-window-emitter</code>,
            <code>lag-watermark-dual-axis-timeline</code>,
            <code>replica-timeline-swimlane-with-causal-arrows</code>,
            <code>rebalance-partition-ownership-swimlane</code>,
            <code>minimal-key-movement-rebalance-diff</code>,
            <code>consistent-hash-ring-virtual-node-placement</code>,
            <code>bloom-filter-visualization-pattern</code>,
            <code>bloom-filter-data-simulation</code>,
            <code>materialized-view-visualization-pattern</code>,
            <code>vector-clock-concurrency-matrix</code>,
            <code>hybrid-logical-clock-merge</code>,
            <code>lease-epoch-fencing-token-monotonic-guard</code>,
            <code>canvas-flowfield-particle-advection</code>,
            <code>time-series-db-visualization-pattern</code>,
            <code>time-series-db-data-simulation</code>,
            <code>cqrs-visualization-pattern</code>,
            <code>command-query-visualization-pattern</code>,
            <code>retry-strategy-visualization-pattern</code>,
            <code>fnv1a-xorshift-text-to-procedural-seed</code>,
            <code>raft-consensus-visualization-pattern</code>,
            <code>outbox-pattern-visualization-pattern</code>,
            <code>saga-pattern-visualization-pattern</code>,
            <code>byte-aware-sms-truncation-with-ellipsis</code>,
            <code>compact-binary-wire-protocol-with-variable-length-encoding</code>,
            <code>mongo-ttl-with-aggregation-delta</code>,
            <code>cache-variance-ttl-jitter</code>
          </div>
        </div>
        <div className="bottom-card">
          <h4>Knowledge respected</h4>
          <div className="subtle" style={{fontSize:10,lineHeight:1.5}}>
            <code>changelog-compaction-tombstone-retention</code>,
            <code>span-hash-determinism</code>,
            <code>event-sourcing-implementation-pitfall</code>,
            <code>cdc-implementation-pitfall</code>,
            <code>materialized-view-implementation-pitfall</code>,
            <code>raft-consensus-implementation-pitfall</code>,
            <code>read-replica-implementation-pitfall</code>,
            <code>kafka-sticky-partitioner-key-null</code>,
            <code>time-unit-consistency-us-ms-ns</code>,
            <code>quorum-visualization-phantom-partition-tick</code>,
            <code>bloom-filter-false-positive-saturation-cliff</code>,
            <code>canvas-trail-fade-vs-clear</code>,
            <code>token-range-ownership-requires-wrap-around-arc</code>,
            <code>additive-registry-schema-versioning</code>,
            <code>concurrent-edge-detection-without-full-clock-compare</code>
          </div>
        </div>
        <div className="bottom-card">
          <h4>World stats</h4>
          <div className="kv"><span>total offsets</span><b>{world.totalOffset.toLocaleString()}</b></div>
          <div className="kv"><span>segments</span><b>{world.segments.length}</b></div>
          <div className="kv"><span>snapshots</span><b>{snapshotCount}</b></div>
          <div className="kv"><span>compacted</span><b>{compacted}</b></div>
          <div className="kv"><span>live records</span><b>{totalLive.toLocaleString()}</b></div>
          <div className="kv"><span>tombstones</span><b>{totalTomb.toLocaleString()}</b></div>
          <div className="kv"><span>avg size</span><b>{Math.round(world.segments.reduce((a,b)=>a+b.sizeMB,0)/world.segments.length)} MB</b></div>
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);