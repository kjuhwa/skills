const { useState, useEffect, useRef, useMemo, useCallback, memo } = React;

// --- simulation constants — channelling kafka-partition-topology-design / symlog-for-lag-metrics-near-zero
const PARTITIONS = 8;
const TIME_SPAN_MS = 60_000;
const TICK_MS = 40;
const DEFAULT_LATENESS = 3_500;

// deterministic prng echoing fnv1a-xorshift-text-to-procedural-seed
function seeded(seed) {
  let s = (seed | 0) || 1;
  return () => {
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
    return ((s >>> 0) % 10_000) / 10_000;
  };
}

// hybrid-logical-clock-merge inspired tick combiner
function hlcMerge(wall, logical, seen) {
  const max = Math.max(wall, seen);
  return { t: max, l: max === seen ? logical + 1 : 0 };
}

// producer engine — streams events per partition w/ bursty behavior (kafka-debounce-event-coalescing)
function createEngine(seed) {
  const rnd = seeded(seed);
  const partitions = Array.from({ length: PARTITIONS }, (_, i) => ({
    id: i,
    watermark: 0,
    hi: 0,
    lag: 0,
    burst: 0,
    tenant: ['alpha', 'beta', 'gamma', 'delta'][i % 4],
  }));
  const events = [];          // kept short by checkpoint barrier
  const barriers = [];        // immutable-action-event-log
  const checkpoints = [];
  return {
    partitions,
    events,
    barriers,
    checkpoints,
    rnd,
    tick(now, rate, lateness) {
      // producers fire per partition
      partitions.forEach((p) => {
        const base = rate * (0.6 + 0.8 * rnd());
        const bursty = rnd() < 0.04 ? 6 : 1;
        const n = Math.max(1, Math.floor(base * bursty / 25));
        p.burst = bursty > 1 ? 1 : p.burst * 0.9;
        for (let i = 0; i < n; i++) {
          // late by up to 2x lateness per sticky-partitioner-key-null observation
          const late = rnd() < 0.08 ? Math.floor(rnd() * lateness * 2) : 0;
          const eventTime = now - late;
          p.hi = Math.max(p.hi, eventTime);
          events.push({
            pid: p.id,
            eventTime,
            procTime: now,
            late: late > lateness,
            val: rnd(),
            key: Math.floor(rnd() * 32),
          });
        }
        // per-partition watermark = high mark - lateness threshold
        p.watermark = Math.max(p.watermark, p.hi - lateness);
        p.lag = Math.max(0, now - p.watermark - lateness);
      });
      // global watermark is min of partitions — classic stream processor invariant
      const global = Math.min(...partitions.map((p) => p.watermark));
      // barrier injection: aligned snapshot broadcast across all partitions
      if (barriers.length === 0 || now - barriers[barriers.length - 1].t > 7_000) {
        const b = { id: barriers.length + 1, t: now, seen: new Set() };
        barriers.push(b);
      }
      // advance barriers across partitions (checkpoint barrier alignment)
      barriers.forEach((b) => {
        if (b.complete) return;
        partitions.forEach((p) => {
          if (p.hi >= b.t) b.seen.add(p.id);
        });
        if (b.seen.size === PARTITIONS) {
          b.complete = true;
          b.doneAt = now;
          checkpoints.push({ id: b.id, t: now, barrierT: b.t, wm: global });
        }
      });
      // forget old events outside span
      while (events.length && events[0].procTime < now - TIME_SPAN_MS) events.shift();
      while (barriers.length > 16) barriers.shift();
      while (checkpoints.length > 16) checkpoints.shift();
      return { globalWatermark: global };
    },
  };
}

// windowing — tumbling/sliding/session — echoes availability-ttl-punctuate-processor + mongo-timestamp-densification
function computeWindows(events, mode, width, slide, session, now) {
  if (events.length === 0) return [];
  if (mode === 'tumbling') {
    const start = Math.floor((now - TIME_SPAN_MS) / width) * width;
    const out = [];
    for (let t = start; t <= now; t += width) out.push({ t0: t, t1: t + width, count: 0 });
    events.forEach((e) => {
      const idx = Math.floor((e.eventTime - start) / width);
      if (idx >= 0 && idx < out.length) out[idx].count++;
    });
    return out;
  }
  if (mode === 'sliding') {
    const out = [];
    for (let t = now - TIME_SPAN_MS; t <= now; t += slide) {
      out.push({ t0: t, t1: t + width, count: 0 });
    }
    events.forEach((e) => {
      out.forEach((w) => { if (e.eventTime >= w.t0 && e.eventTime < w.t1) w.count++; });
    });
    return out;
  }
  // session — group by partition with gap
  const perKey = new Map();
  events.forEach((e) => {
    const k = e.pid + ':' + (e.key & 3);
    if (!perKey.has(k)) perKey.set(k, []);
    perKey.get(k).push(e);
  });
  const out = [];
  perKey.forEach((list, k) => {
    list.sort((a, b) => a.eventTime - b.eventTime);
    let cur = null;
    list.forEach((e) => {
      if (!cur || e.eventTime - cur.t1 > session) {
        if (cur) out.push(cur);
        cur = { t0: e.eventTime, t1: e.eventTime, count: 1, key: k };
      } else {
        cur.t1 = e.eventTime;
        cur.count++;
      }
    });
    if (cur) out.push(cur);
  });
  return out;
}

// ---------- React components ----------
const Brand = memo(function Brand({ wm, events, rate, ckpt }) {
  const wmAgo = Math.max(0, Date.now() - wm);
  return (
    <header className="brand">
      <h1>Watermark · Tide · Atlas</h1>
      <span className="chip">STREAM PROCESSOR</span>
      <span className="chip">WINDOWING · WATERMARK · BARRIER</span>
      <div className="spacer" />
      <div className="wm">
        <span>WM lag <strong>{(wmAgo / 1000).toFixed(2)}s</strong></span>
        <span>EVT/s <strong>{rate}</strong></span>
        <span>EVENTS <strong>{events}</strong></span>
        <span>CKPT <strong>{ckpt}</strong></span>
      </div>
    </header>
  );
});

// custom hook — animation loop (sse-fetch-streaming style continuous feed)
function useAnimationFrame(cb, running) {
  const ref = useRef();
  useEffect(() => {
    if (!running) return;
    let last = performance.now();
    const loop = (now) => {
      const dt = now - last; last = now;
      cb(dt, now);
      ref.current = requestAnimationFrame(loop);
    };
    ref.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(ref.current);
  }, [cb, running]);
}

// custom hook — responsive canvas sizing mindful of canvas-event-coord-devicepixel-rescale
function useHiDPICanvas(ref) {
  const [dim, setDim] = useState({ w: 0, h: 0, dpr: 1 });
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ro = new ResizeObserver(() => {
      const dpr = window.devicePixelRatio || 1;
      const rect = c.getBoundingClientRect();
      c.width = Math.floor(rect.width * dpr);
      c.height = Math.floor(rect.height * dpr);
      setDim({ w: rect.width, h: rect.height, dpr });
    });
    ro.observe(c);
    return () => ro.disconnect();
  }, [ref]);
  return dim;
}

function ControlPanel({ state, setState, partitions, selPid, setSelPid }) {
  return (
    <aside className="left">
      <h3>Pipeline Config</h3>
      <div className="ctrl active">
        <label>Event rate (msg/s)</label>
        <div className="row">
          <input type="range" min="50" max="3000" value={state.rate}
            onChange={(e) => setState({ ...state, rate: +e.target.value })} />
          <span className="val">{state.rate}</span>
        </div>
      </div>
      <div className="ctrl">
        <label>Watermark lateness (ms)</label>
        <div className="row">
          <input type="range" min="500" max="10000" step="100" value={state.lateness}
            onChange={(e) => setState({ ...state, lateness: +e.target.value })} />
          <span className="val">{state.lateness}</span>
        </div>
      </div>
      <div className="ctrl">
        <label>Checkpoint barrier interval (ms)</label>
        <div className="row">
          <input type="range" min="2000" max="15000" step="500" value={state.barrierEvery}
            onChange={(e) => setState({ ...state, barrierEvery: +e.target.value })} />
          <span className="val">{state.barrierEvery}</span>
        </div>
      </div>
      <h3>Window Mode</h3>
      <div className="win-mode">
        {['tumbling', 'sliding', 'session'].map((m) => (
          <button key={m} className={state.windowMode === m ? 'on' : ''}
            onClick={() => setState({ ...state, windowMode: m })}>{m.toUpperCase()}</button>
        ))}
      </div>
      <div className="ctrl">
        <label>Window width (ms)</label>
        <div className="row">
          <input type="range" min="1000" max="10000" step="250" value={state.width}
            onChange={(e) => setState({ ...state, width: +e.target.value })} />
          <span className="val">{state.width}</span>
        </div>
      </div>
      <div className="ctrl">
        <label>Slide / Session gap (ms)</label>
        <div className="row">
          <input type="range" min="250" max="5000" step="125" value={state.slide}
            onChange={(e) => setState({ ...state, slide: +e.target.value })} />
          <span className="val">{state.slide}</span>
        </div>
      </div>
      <h3>Partitions</h3>
      <div className="partition-list">
        {partitions.map((p) => (
          <div key={p.id} className={'p ' + (selPid === p.id ? 'sel' : '')} onClick={() => setSelPid(p.id)}>
            <span className="id">P{p.id}</span>
            <div>
              <div style={{ fontSize: 10 }}>{p.tenant}</div>
              <div className="bar"><span style={{ width: Math.min(100, p.lag / 80) + '%' }} /></div>
            </div>
            <span className="lag">{Math.round(p.lag)}ms</span>
          </div>
        ))}
      </div>
    </aside>
  );
}

// Stage canvas draws the tide — echoes canvas-flowfield-particle-advection, parallax-sine-silhouette-horizon
const Stage = memo(function Stage({ engine, state, now, windows, selPid }) {
  const canvasRef = useRef();
  const dim = useHiDPICanvas(canvasRef);

  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext('2d');
    const { w, h, dpr } = dim;
    if (!w) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // canvas-trail-fade-vs-clear — alpha overpaint for subtle trail feel
    ctx.fillStyle = 'rgba(10,14,26,0.35)';
    ctx.fillRect(0, 0, w, h);

    // time axis maps procTime (now - TIME_SPAN_MS .. now) -> x
    const t0 = now - TIME_SPAN_MS;
    const tx = (t) => ((t - t0) / TIME_SPAN_MS) * (w - 40) + 30;
    const laneH = (h - 60) / PARTITIONS;
    const ly = (i) => 40 + i * laneH;

    // grid
    ctx.strokeStyle = 'rgba(0,212,255,0.08)';
    ctx.lineWidth = 1;
    for (let gt = Math.floor(t0 / 5000) * 5000; gt <= now; gt += 5000) {
      const x = tx(gt);
      ctx.beginPath(); ctx.moveTo(x, 30); ctx.lineTo(x, h - 10); ctx.stroke();
      ctx.fillStyle = '#38486a';
      ctx.font = '10px "SF Mono", monospace';
      ctx.fillText(new Date(gt).toISOString().slice(14, 19), x + 4, h - 4);
    }

    // partition swimlanes (rebalance-partition-ownership-swimlane inspired)
    engine.partitions.forEach((p, i) => {
      ctx.fillStyle = selPid === i ? 'rgba(0,212,255,0.09)' : 'rgba(255,255,255,0.02)';
      ctx.fillRect(30, ly(i), w - 40, laneH - 4);
      ctx.fillStyle = '#6c7a94';
      ctx.font = '10px "SF Mono", monospace';
      ctx.fillText('P' + i + ' · ' + p.tenant, 4, ly(i) + 12);
    });

    // windows overlay behind events
    if (state.windowMode !== 'session') {
      windows.forEach((win, idx) => {
        if (win.count === 0) return;
        const x0 = tx(win.t0); const x1 = tx(win.t1);
        const hue = 190 + (idx % 4) * 5;
        const alpha = Math.min(0.35, 0.08 + win.count / 400);
        ctx.fillStyle = `hsla(${hue},70%,40%,${alpha})`;
        ctx.fillRect(x0, 30, x1 - x0, h - 40);
        if (state.windowMode === 'tumbling') {
          ctx.strokeStyle = 'rgba(0,212,255,0.3)';
          ctx.beginPath(); ctx.moveTo(x0, 30); ctx.lineTo(x0, h - 10); ctx.stroke();
        }
      });
    } else {
      windows.forEach((win) => {
        const pid = +win.key.split(':')[0];
        const y = ly(pid) + laneH / 2 - 5;
        ctx.fillStyle = 'rgba(0,245,160,0.22)';
        ctx.fillRect(tx(win.t0), y, Math.max(2, tx(win.t1) - tx(win.t0)), 10);
      });
    }

    // events — tiny dots, late ones red
    ctx.globalAlpha = 0.95;
    engine.events.forEach((e) => {
      const x = tx(e.eventTime);
      const y = ly(e.pid) + (laneH / 2) + (e.val - 0.5) * (laneH - 14);
      ctx.fillStyle = e.late ? 'rgba(255,86,116,0.9)' : 'rgba(0,212,255,0.7)';
      ctx.fillRect(x, y, 2, 2);
      if (e.late) {
        ctx.strokeStyle = 'rgba(255,86,116,0.35)';
        ctx.beginPath();
        ctx.moveTo(tx(e.eventTime), y);
        ctx.lineTo(tx(e.procTime), y);
        ctx.stroke();
      }
    });
    ctx.globalAlpha = 1;

    // watermark per partition
    engine.partitions.forEach((p, i) => {
      const x = tx(p.watermark);
      ctx.strokeStyle = 'rgba(0,212,255,0.55)';
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(x, ly(i)); ctx.lineTo(x, ly(i) + laneH - 4); ctx.stroke();
    });

    // global watermark
    const globalWM = Math.min(...engine.partitions.map((p) => p.watermark));
    const gx = tx(globalWM);
    ctx.strokeStyle = '#00d4ff';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath(); ctx.moveTo(gx, 30); ctx.lineTo(gx, h - 10); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#00d4ff';
    ctx.fillRect(gx - 4, 24, 8, 8);

    // barriers — aligned checkpoint broadcast (immutable-action-event-log)
    engine.barriers.forEach((b) => {
      const x = tx(b.t);
      if (x < 30 || x > w - 10) return;
      ctx.strokeStyle = b.complete ? '#00f5a0' : '#ffd166';
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(x, 30); ctx.lineTo(x, h - 10); ctx.stroke();
      ctx.fillStyle = b.complete ? '#00f5a0' : '#ffd166';
      ctx.font = '10px "SF Mono", monospace';
      ctx.fillText('B' + b.id, x + 3, 42);
    });
  }, [dim, engine, state, now, windows, selPid]);

  return (
    <main className="stage">
      <canvas ref={canvasRef} />
      <div className="legend">
        <div className="k"><div className="dot" style={{ background: '#00d4ff' }} />event</div>
        <div className="k"><div className="dot" style={{ background: '#ff5674' }} />late</div>
        <div className="k"><div className="dot" style={{ background: '#ffd166' }} />barrier</div>
        <div className="k"><div className="dot" style={{ background: '#00f5a0' }} />checkpoint</div>
      </div>
    </main>
  );
});

// Tape — scroll through past checkpoints (event-sourcing-visualization-pattern)
function Tape({ checkpoints, barriers, scrub, setScrub, play, setPlay }) {
  const canvasRef = useRef();
  const dim = useHiDPICanvas(canvasRef);
  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext('2d');
    const { w, h, dpr } = dim; if (!w) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(0,212,255,0.22)';
    ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();

    barriers.forEach((b, i) => {
      const x = (i / Math.max(1, barriers.length - 1)) * (w - 40) + 20;
      ctx.fillStyle = b.complete ? '#00f5a0' : '#ffd166';
      ctx.beginPath(); ctx.arc(x, h / 2, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#6c7a94';
      ctx.font = '10px "SF Mono", monospace';
      ctx.fillText('B' + b.id, x - 8, h / 2 + 22);
    });
    // scrubber
    const sx = scrub * (w - 40) + 20;
    ctx.strokeStyle = '#00d4ff';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(sx, 6); ctx.lineTo(sx, h - 6); ctx.stroke();
  }, [dim, checkpoints, barriers, scrub]);

  return (
    <section className="tape">
      <div className="tape-head">
        <h3>Checkpoint Tape · Replay</h3>
        <button className={'play ' + (play ? '' : 'paused')} onClick={() => setPlay(!play)}>
          {play ? 'LIVE' : 'PAUSED'}
        </button>
        <div className="scrub">
          <span className="pill">SCRUB</span>
          <input type="range" min="0" max="1" step="0.001" value={scrub}
            onChange={(e) => setScrub(+e.target.value)} />
        </div>
      </div>
      <div className="tape-body"><canvas ref={canvasRef} /></div>
    </section>
  );
}

// Right pane — metrics, causality grid, changelog
function Inspector({ engine, state, now, windows, selPid, changelog }) {
  const p = engine.partitions[selPid];
  const wmAge = now - p.watermark;
  const colorLag = wmAge > state.lateness * 2 ? 'warn' : wmAge < state.lateness ? 'ok' : '';
  const lastCkpt = engine.checkpoints[engine.checkpoints.length - 1];
  const lastBarrier = engine.barriers[engine.barriers.length - 1];

  // causal grid built from the last N barriers across partitions — borrows vector-clock-concurrency-matrix
  const nodes = useMemo(() => engine.barriers.slice(-5).map((b) => b), [engine.barriers]);
  const classify = (a, b) => {
    if (!a || !b) return 'self';
    if (a.id === b.id) return 'self';
    if (a.t < b.t && a.doneAt && b.doneAt && a.doneAt < b.doneAt) return 'before';
    if (a.t > b.t && a.doneAt && b.doneAt && a.doneAt > b.doneAt) return 'after';
    return 'conc';
  };

  return (
    <aside className="right">
      <h3>Partition Inspector · P{selPid}</h3>
      <div className="metric">
        <span className="lbl">WM Age</span>
        <span className={'v ' + colorLag}>{Math.round(wmAge)} ms</span>
        <span className="sub">
          lag exceeds {state.lateness}ms → shed / side-output (channels `lantern-implementation-pitfall`)
        </span>
      </div>
      <div className="metric">
        <span className="lbl">Events</span>
        <span className="v">{engine.events.filter((e) => e.pid === selPid).length}</span>
      </div>
      <div className="metric">
        <span className="lbl">Tenant</span>
        <span className="v ok">{p.tenant}</span>
      </div>
      <div className="metric">
        <span className="lbl">Last Barrier</span>
        <span className="v">{lastBarrier ? 'B' + lastBarrier.id : '—'}</span>
        <span className="sub">
          alignment status: {lastBarrier ? lastBarrier.seen.size + '/' + PARTITIONS : '—'}
        </span>
      </div>
      <div className="metric">
        <span className="lbl">Last CKPT</span>
        <span className="v ok">{lastCkpt ? 'C' + lastCkpt.id : '—'}</span>
      </div>
      <h3>Barrier Causality</h3>
      <div className="causal-grid"
        style={{ gridTemplateColumns: 'repeat(' + Math.max(1, nodes.length) + ', 1fr)' }}>
        {nodes.flatMap((a, i) =>
          nodes.map((b, j) => {
            const k = classify(a, b);
            const label = k === 'self' ? '·' : k === 'before' ? '<' : k === 'after' ? '>' : '‖';
            return <div key={i + '-' + j} className={'cell ' + k}>{label}</div>;
          })
        )}
      </div>
      <h3>Changelog Topic</h3>
      <div className="changelog">
        {changelog.slice(-28).reverse().map((r, i) => (
          <div key={i} className={'row ' + r.kind}>
            <span className="ts">{new Date(r.t).toISOString().slice(14, 21)}</span>
            <span className="kind">{r.kind.toUpperCase()}</span>
            <span className="msg">{r.msg}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}

// Root ---------------------------------------------------------------
function App() {
  const [state, setState] = useState({
    rate: 900,
    lateness: DEFAULT_LATENESS,
    barrierEvery: 7000,
    windowMode: 'tumbling',
    width: 3000,
    slide: 1000,
  });
  const [selPid, setSelPid] = useState(0);
  const [play, setPlay] = useState(true);
  const [scrub, setScrub] = useState(1);
  const engineRef = useRef(createEngine(1337));
  const [tick, setTick] = useState(0);
  const changelogRef = useRef([]);
  const lastBarrierCount = useRef(0);
  const lastCkptCount = useRef(0);
  const lastLateCount = useRef(0);

  useAnimationFrame(() => {
    if (!play) return;
    const now = performance.now() + 1_700_000_000_000;
    engineRef.current.tick(now, state.rate, state.lateness);
    // emit changelog entries (cdc-visualization-pattern / outbox-pattern-visualization-pattern)
    const bc = engineRef.current.barriers.length;
    if (bc > lastBarrierCount.current) {
      const b = engineRef.current.barriers[bc - 1];
      changelogRef.current.push({ t: b.t, kind: 'bar', msg: `barrier B${b.id} injected @${b.seen.size}/${PARTITIONS}` });
      lastBarrierCount.current = bc;
    }
    const cc = engineRef.current.checkpoints.length;
    if (cc > lastCkptCount.current) {
      const c = engineRef.current.checkpoints[cc - 1];
      changelogRef.current.push({ t: c.t, kind: 'ck', msg: `checkpoint C${c.id} committed wm=${new Date(c.wm).toISOString().slice(17,21)}` });
      lastCkptCount.current = cc;
    }
    const late = engineRef.current.events.filter((e) => e.late).length;
    if (late > lastLateCount.current + 20) {
      changelogRef.current.push({ t: now, kind: 'lte', msg: `late-event surge ${late - lastLateCount.current} events` });
      lastLateCount.current = late;
    }
    if (changelogRef.current.length > 200) changelogRef.current.splice(0, changelogRef.current.length - 200);
    setTick((x) => x + 1);
  }, play);

  const now = performance.now() + 1_700_000_000_000;
  const windows = useMemo(
    () => computeWindows(engineRef.current.events, state.windowMode, state.width, state.slide, state.slide, now),
    [tick, state.windowMode, state.width, state.slide]
  );

  // keyboard shortcuts: space toggles play, [ ] cycles partition
  useEffect(() => {
    const h = (e) => {
      if (e.code === 'Space') { e.preventDefault(); setPlay((p) => !p); }
      if (e.code === 'BracketLeft') setSelPid((p) => (p - 1 + PARTITIONS) % PARTITIONS);
      if (e.code === 'BracketRight') setSelPid((p) => (p + 1) % PARTITIONS);
      if (e.key >= '1' && e.key <= '3') {
        const m = ['tumbling', 'sliding', 'session'][+e.key - 1];
        setState((s) => ({ ...s, windowMode: m }));
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  return (
    <div className="app">
      <Brand wm={Math.min(...engineRef.current.partitions.map((p) => p.watermark))}
        events={engineRef.current.events.length}
        rate={state.rate}
        ckpt={engineRef.current.checkpoints.length} />
      <ControlPanel state={state} setState={setState}
        partitions={engineRef.current.partitions}
        selPid={selPid} setSelPid={setSelPid} />
      <Stage engine={engineRef.current} state={state} now={now} windows={windows} selPid={selPid} />
      <Tape checkpoints={engineRef.current.checkpoints}
        barriers={engineRef.current.barriers}
        scrub={scrub} setScrub={setScrub}
        play={play} setPlay={setPlay} />
      <Inspector engine={engineRef.current} state={state} now={now}
        windows={windows} selPid={selPid}
        changelog={changelogRef.current} />
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);