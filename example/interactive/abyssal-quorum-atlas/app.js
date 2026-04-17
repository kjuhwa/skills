const { useState, useEffect, useRef, useMemo, useCallback, memo } = React;

// ---------- deterministic PRNG (consistent-hashing-data-simulation / raft-consensus-data-simulation) ----------
const mulberry32 = (seed) => {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const fnv1a = (str) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
};

// ---------- HLC merge (hybrid-logical-clock-merge) ----------
const hlcNext = (prev, wall) => {
  if (wall > prev.wall) return { wall, logical: 0 };
  return { wall: prev.wall, logical: prev.logical + 1 };
};

// ---------- cluster factory ----------
const REGIONS = ["abyssal","hadal","pelagic","neritic"];
const ROLES = ["registry","gateway","broker","projector","replicator","planner"];

const buildCluster = (seed, count) => {
  const rand = mulberry32(seed);
  const nodes = [];
  for (let i = 0; i < count; i++) {
    const id = `node-${(i+1).toString().padStart(2,"0")}`;
    const region = REGIONS[i % REGIONS.length];
    const role = ROLES[i % ROLES.length];
    const angle = (i / count) * Math.PI * 2 - Math.PI/2;
    nodes.push({
      id,
      region, role,
      angle,
      prio: fnv1a(id) / 4294967296,
      term: 1,
      state: "FOLLOWER",
      lastBeat: 0,
      lagMs: Math.floor(rand()*20),
      inflight: Math.floor(rand()*40),
      load: rand(),
      partition: 0,
      suspect: false,
      voteFor: null,
    });
  }
  nodes[0].state = "LEADER";
  return nodes;
};

// ---------- event log ----------
const MAX_LOG = 320;
const logAppend = (log, entry) => {
  const next = log.slice(-MAX_LOG+1);
  next.push(entry);
  return next;
};

// ---------- simulation reducer (event-returning-pure-reducer) ----------
const step = (state, dt) => {
  const { nodes, tick, partitioned, seed, heartbeatMs, electionTimeoutMs, lagBudget, log } = state;
  const rand = mulberry32(seed + tick);
  let newNodes = nodes.map(n => ({...n}));
  const events = [];
  const nowMs = tick * 100;

  // Partition assignment: when partitioned, halve by prio
  if (partitioned) {
    newNodes.forEach((n,i) => { n.partition = i < newNodes.length/2 ? 1 : 2; });
  } else {
    newNodes.forEach(n => { n.partition = 0; });
  }

  // Heartbeat emission from leader(s)
  const leaders = newNodes.filter(n => n.state === "LEADER");
  leaders.forEach(ld => {
    ld.lastBeat = nowMs;
    newNodes.forEach(n => {
      if (n.id === ld.id) return;
      if (partitioned && n.partition !== ld.partition) return;
      // heartbeat received
      n.lastBeat = Math.max(n.lastBeat, nowMs - Math.floor(rand()*lagBudget));
      n.term = Math.max(n.term, ld.term);
      if (n.state !== "LEADER") n.state = "FOLLOWER";
    });
  });

  // Suspect / stale detection (frozen-detection-consecutive-count)
  newNodes.forEach(n => {
    const age = nowMs - n.lastBeat;
    n.suspect = age > heartbeatMs * 2;
    if (n.suspect && n.state === "FOLLOWER") n.state = "CANDIDATE_PENDING";
  });

  // Election (raft-consensus-data-simulation)
  const partitions = partitioned ? [1,2] : [0];
  partitions.forEach(p => {
    const group = newNodes.filter(n => (partitioned ? n.partition === p : true));
    if (!group.length) return;
    const quorum = Math.floor(group.length/2) + 1;
    const hasLiveLeader = group.some(n => n.state === "LEADER" && !n.suspect);
    const candidates = group.filter(n => n.state === "CANDIDATE_PENDING");
    if (!hasLiveLeader && candidates.length) {
      // pick highest prio candidate
      candidates.sort((a,b) => b.prio - a.prio);
      const winner = candidates[0];
      // count votes among live members
      const live = group.filter(n => !n.suspect);
      if (live.length >= quorum) {
        winner.term += 1;
        winner.state = "LEADER";
        group.forEach(n => {
          if (n.id !== winner.id && !n.suspect) n.state = "FOLLOWER";
          n.voteFor = winner.id;
        });
        events.push({ t: nowMs, lvl:"ELECT", msg:`${winner.id} won term ${winner.term} (p${p}) votes=${live.length}/${group.length} quorum=${quorum}` });
      } else {
        events.push({ t: nowMs, lvl:"QUOR", msg:`p${p} under quorum (${live.length}<${quorum}) — waiting` });
      }
    } else if (!hasLiveLeader) {
      // demote a random follower to candidate pending
      const alive = group.filter(n => !n.suspect);
      if (alive.length) {
        const pick = alive[Math.floor(rand()*alive.length)];
        if (pick.state !== "LEADER") pick.state = "CANDIDATE_PENDING";
      }
    }
  });

  // Heartbeat tick log
  if (tick % 8 === 0) {
    leaders.forEach(l => events.push({ t: nowMs, lvl:"HEART", msg:`${l.id} → fan-out beat term=${l.term}` }));
  }

  // Load / lag drift
  newNodes.forEach(n => {
    n.load = Math.max(0, Math.min(1, n.load + (rand()-0.5)*0.06));
    n.inflight = Math.max(0, Math.round(n.inflight + (rand()-0.5)*4));
    n.lagMs = Math.max(0, Math.round(n.lagMs + (rand()-0.5)*lagBudget*0.15));
  });

  // Join event occasionally
  if (tick % 57 === 0) {
    const j = newNodes[Math.floor(rand()*newNodes.length)];
    events.push({ t: nowMs, lvl:"JOIN", msg:`${j.id} heartbeat re-registered to registry` });
  }

  // Partition log when active
  if (partitioned && tick % 20 === 0) {
    events.push({ t: nowMs, lvl:"PART", msg:`split-brain active — minority side starves for quorum` });
  }

  let newLog = log;
  events.forEach(e => { newLog = logAppend(newLog, e); });

  return { ...state, tick: tick+1, nodes: newNodes, log: newLog };
};

// ---------- custom hook: animation loop ----------
const useRaf = (cb, active) => {
  const ref = useRef(cb);
  useEffect(() => { ref.current = cb; }, [cb]);
  useEffect(() => {
    if (!active) return;
    let id, last = performance.now();
    const loop = (t) => {
      const dt = t - last; last = t;
      ref.current(dt);
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [active]);
};

// ---------- custom hook: canvas + hidpi ----------
const useHiDpiCanvas = () => {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const resize = () => {
      const r = c.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      c.width = r.width * dpr; c.height = r.height * dpr;
      const ctx = c.getContext("2d"); ctx.setTransform(dpr,0,0,dpr,0,0);
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);
  return ref;
};

// ---------- topology renderer ----------
const drawTopology = (canvas, nodes, partitioned, tick, hoverId, selectedId) => {
  const ctx = canvas.getContext("2d");
  const r = canvas.getBoundingClientRect();
  const W = r.width, H = r.height;
  ctx.clearRect(0,0,W,H);

  // abyssal gradient backdrop
  const bg = ctx.createRadialGradient(W/2, H/2, 20, W/2, H/2, Math.max(W,H)*0.7);
  bg.addColorStop(0, "#0f1d3a");
  bg.addColorStop(1, "#060a14");
  ctx.fillStyle = bg;
  ctx.fillRect(0,0,W,H);

  // Bioluminescent grid
  ctx.strokeStyle = "rgba(0,212,255,.05)";
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
  for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

  const cx = W/2, cy = H/2;
  const radius = Math.min(W,H)*0.34;

  // Quorum ring (two if partitioned)
  const drawRing = (rOff, color, alpha) => {
    ctx.beginPath();
    ctx.arc(cx, cy, radius + rOff, 0, Math.PI*2);
    ctx.strokeStyle = color;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = 1;
    ctx.setLineDash([4,4]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  };
  drawRing(0, "#00d4ff", 0.25);
  drawRing(-24, "#00d4ff", 0.12);
  drawRing(24, "#00d4ff", 0.12);

  // position nodes
  const pos = {};
  nodes.forEach((n,i) => {
    let ang = n.angle + (tick*0.002);
    let rr = radius;
    if (partitioned) {
      rr = n.partition === 1 ? radius * 0.78 : radius * 1.05;
      const shift = n.partition === 1 ? -40 : 40;
      pos[n.id] = { x: cx + Math.cos(ang)*rr + shift, y: cy + Math.sin(ang)*rr };
    } else {
      pos[n.id] = { x: cx + Math.cos(ang)*rr, y: cy + Math.sin(ang)*rr };
    }
  });

  // leader beams to all followers
  const leaders = nodes.filter(n => n.state === "LEADER");
  leaders.forEach(ld => {
    const p = pos[ld.id];
    nodes.forEach(n => {
      if (n.id === ld.id) return;
      if (partitioned && n.partition !== ld.partition) return;
      const q = pos[n.id];
      const g = ctx.createLinearGradient(p.x,p.y,q.x,q.y);
      g.addColorStop(0, "rgba(0,212,255,.55)");
      g.addColorStop(1, "rgba(0,212,255,.05)");
      ctx.strokeStyle = g;
      ctx.lineWidth = n.suspect ? 0.5 : 1.3;
      ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(q.x,q.y); ctx.stroke();
    });
  });

  // Heartbeat pulses
  nodes.forEach(n => {
    const p = pos[n.id];
    const age = (tick - Math.floor(n.lastBeat/100)) % 20;
    const pulse = 1 - age/20;
    if (pulse > 0 && !n.suspect) {
      ctx.beginPath();
      ctx.arc(p.x,p.y, 14 + (1-pulse)*24, 0, Math.PI*2);
      ctx.strokeStyle = `rgba(79,255,168,${pulse*0.55})`;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  });

  // Partition cleaver line
  if (partitioned) {
    ctx.strokeStyle = "rgba(255,79,109,.35)";
    ctx.setLineDash([6,6]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, 0); ctx.lineTo(cx, H);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Nodes
  nodes.forEach(n => {
    const p = pos[n.id];
    const isLeader = n.state === "LEADER";
    const color = n.suspect ? "#ff4f6d" : (isLeader ? "#00d4ff" : (n.state === "CANDIDATE_PENDING" ? "#ffb347" : "#4fffa8"));
    const size = isLeader ? 12 : 8;

    // glow
    ctx.shadowColor = color;
    ctx.shadowBlur = isLeader ? 22 : 10;
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(p.x,p.y,size,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;

    if (n.id === hoverId || n.id === selectedId) {
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(p.x,p.y,size+4,0,Math.PI*2); ctx.stroke();
    }

    // label
    ctx.fillStyle = "#d4e8ff";
    ctx.font = "10px ui-monospace";
    ctx.textAlign = "center";
    ctx.fillText(n.id, p.x, p.y + size + 14);
    ctx.fillStyle = "#6f86a8";
    ctx.font = "9px ui-monospace";
    ctx.fillText(n.role, p.x, p.y + size + 26);
  });

  return pos;
};

// ---------- memoized chart components ----------
const HistoBar = memo(({ vals, height, color }) => {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const r = c.getBoundingClientRect();
    const dpr = window.devicePixelRatio||1;
    c.width = r.width*dpr; c.height = r.height*dpr;
    const ctx = c.getContext("2d"); ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,r.width,r.height);
    const bins = 28;
    const hist = new Array(bins).fill(0);
    const max = Math.max(1, ...vals);
    vals.forEach(v => {
      const bi = Math.min(bins-1, Math.floor((v/max) * bins));
      hist[bi]++;
    });
    const mx = Math.max(1, ...hist);
    const bw = r.width / bins;
    hist.forEach((h,i) => {
      const bh = (h/mx) * (r.height-4);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.85;
      ctx.fillRect(i*bw+1, r.height-bh, bw-2, bh);
    });
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "#1c2a44";
    ctx.beginPath(); ctx.moveTo(0,r.height-0.5); ctx.lineTo(r.width,r.height-0.5); ctx.stroke();
  }, [vals, height, color]);
  return <canvas ref={ref} className="mini" style={{height}}/>;
});

const TimelineStrip = memo(({ series, color }) => {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const r = c.getBoundingClientRect();
    const dpr = window.devicePixelRatio||1;
    c.width = r.width*dpr; c.height = r.height*dpr;
    const ctx = c.getContext("2d"); ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,r.width,r.height);
    // grid
    ctx.strokeStyle = "#1c2a44";
    for (let y=0;y<r.height;y+=r.height/4){
      ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(r.width,y); ctx.stroke();
    }
    const max = Math.max(1, ...series);
    ctx.beginPath();
    series.forEach((v,i) => {
      const x = (i/(series.length-1)) * r.width;
      const y = r.height - (v/max) * (r.height-4) - 2;
      if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    // fill
    ctx.lineTo(r.width, r.height); ctx.lineTo(0, r.height); ctx.closePath();
    const g = ctx.createLinearGradient(0,0,0,r.height);
    g.addColorStop(0, color + "55"); g.addColorStop(1, color + "00");
    ctx.fillStyle = g; ctx.fill();
  }, [series, color]);
  return <canvas ref={ref} className="mini" style={{height:"100%"}}/>;
});

// ---------- side panels ----------
const NodeList = memo(({ nodes, selected, onSelect }) => (
  <div className="node-list">
    {nodes.map(n => (
      <div key={n.id}
           className={`node-chip ${n.state==="LEADER"?"leader":""} ${selected===n.id?"selected":""}`}
           onClick={() => onSelect(n.id)}>
        <span className={`dot ${n.suspect?"danger":(n.state==="LEADER"?"ok":(n.state==="CANDIDATE_PENDING"?"warn":"ok"))}`}/>
        <span>
          <div className="id">{n.id}</div>
          <div className="role">{n.role} · {n.region}</div>
        </span>
        <span className="role">t{n.term}</span>
      </div>
    ))}
  </div>
));

const EventLog = memo(({ log }) => (
  <div className="log">
    {log.slice(-120).reverse().map((l, i) => (
      <div className="line" key={log.length-1-i}>
        <span className="t">{(l.t/1000).toFixed(1)}s</span>
        <span className={`lvl ${l.lvl}`}>{l.lvl}</span>
        <span>{l.msg}</span>
      </div>
    ))}
  </div>
));

// ---------- main app ----------
const App = () => {
  const [seed] = useState(() => Math.floor(Math.random()*9999) + 42);
  const [state, setState] = useState(() => ({
    tick: 0,
    nodes: buildCluster(seed, 12),
    partitioned: false,
    seed,
    heartbeatMs: 500,
    electionTimeoutMs: 1500,
    lagBudget: 80,
    log: [{ t:0, lvl:"JOIN", msg:`atlas online — fleet of 12 registered to abyssal registry`}],
    running: true,
    speed: 1,
  }));
  const [selected, setSelected] = useState("node-01");
  const [hover, setHover] = useState(null);
  const [tip, setTip] = useState(null);

  const canvasRef = useHiDpiCanvas();
  const posRef = useRef({});

  useRaf(() => {
    setState(s => s.running ? step(s, 16) : s);
  }, state.running);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    posRef.current = drawTopology(c, state.nodes, state.partitioned, state.tick, hover, selected);
  }, [state.nodes, state.partitioned, state.tick, hover, selected]);

  // hover detection (canvas-event-coord-devicepixel-rescale)
  const onMove = useCallback((e) => {
    const c = canvasRef.current;
    const r = c.getBoundingClientRect();
    const x = (e.clientX - r.left) * (c.width/r.width) / (window.devicePixelRatio||1);
    const y = (e.clientY - r.top)  * (c.height/r.height) / (window.devicePixelRatio||1);
    let best=null, bestD=24;
    for (const id in posRef.current) {
      const p = posRef.current[id];
      const d = Math.hypot(p.x-x, p.y-y);
      if (d < bestD) { bestD = d; best = id; }
    }
    setHover(best);
    if (best) {
      const n = state.nodes.find(nd => nd.id === best);
      setTip({ x: e.clientX, y: e.clientY, node: n });
    } else setTip(null);
  }, [state.nodes]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === " ") { e.preventDefault(); setState(s=>({...s, running:!s.running})); }
      if (e.key === "p") setState(s=>({...s, partitioned:!s.partitioned}));
      if (e.key === "r") setState(s=>({...s, nodes: buildCluster(s.seed + s.tick, 12), tick:0, log:[] }));
      if (e.key === "+") setState(s=>({...s, speed:Math.min(4, s.speed+0.5)}));
      if (e.key === "-") setState(s=>({...s, speed:Math.max(0.25, s.speed-0.5)}));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const stats = useMemo(() => {
    const live = state.nodes.filter(n => !n.suspect).length;
    const partitions = state.partitioned ? [1,2] : [0];
    let hasQuorum = false;
    partitions.forEach(p => {
      const g = state.nodes.filter(n => state.partitioned ? n.partition===p : true);
      const l = g.filter(n => !n.suspect).length;
      const q = Math.floor(g.length/2)+1;
      if (l >= q) hasQuorum = true;
    });
    const leaders = state.nodes.filter(n => n.state==="LEADER").length;
    const lagMax = Math.max(...state.nodes.map(n => n.lagMs));
    const lagAvg = state.nodes.reduce((a,n)=>a+n.lagMs,0) / state.nodes.length;
    const quorumSize = Math.floor(state.nodes.length/2) + 1;
    return { live, hasQuorum, leaders, lagMax, lagAvg, quorumSize };
  }, [state.nodes, state.partitioned]);

  const sel = state.nodes.find(n => n.id === selected) || state.nodes[0];
  const lagSeries = useMemo(() => state.nodes.map(n => n.lagMs), [state.nodes]);
  const inflightSeries = useMemo(() => state.nodes.map(n => n.inflight), [state.nodes]);

  // time-series history buffer
  const [history, setHistory] = useState([]);
  useEffect(() => {
    setHistory(h => [...h.slice(-119), stats.lagAvg]);
  }, [state.tick]);

  return (
    <div className="app">
      <div className="head">
        <div className="brand">Abyssal Quorum Atlas</div>
        <div className="crumbs">cluster → abyssal-west-1 · fleet:12 · quorum:{stats.quorumSize}</div>
        <div className="spacer"/>
        <button className="btn" onClick={()=>setState(s=>({...s, running:!s.running}))}>
          {state.running?"pause":"resume"} [space]
        </button>
        <button className={`btn ${state.partitioned?"danger":""}`}
                onClick={()=>setState(s=>({...s, partitioned:!s.partitioned}))}>
          {state.partitioned?"heal partition":"inject split"} [p]
        </button>
        <button className="btn" onClick={()=>setState(s=>({...s, nodes: buildCluster(s.seed + s.tick, 12), tick:0, log:[{t:0,lvl:"JOIN",msg:"fleet recycled"}] }))}>
          recycle [r]
        </button>
        <div className="clock">t+{(state.tick*0.1).toFixed(1)}s · x{state.speed.toFixed(2)}</div>
      </div>

      <div className="panel left">
        <h3>Fleet Roster</h3>
        <NodeList nodes={state.nodes} selected={selected} onSelect={setSelected}/>
        <h4>Discovery Registry</h4>
        <div className="row"><span className="k">registry shards</span><span className="v">4</span></div>
        <div className="row"><span className="k">join ttl</span><span className="v">30s</span></div>
        <div className="row"><span className="k">heartbeat ttl</span><span className="v">{state.heartbeatMs*2}ms</span></div>
        <div className="row"><span className="k">election timeout</span><span className="v">{state.electionTimeoutMs}ms</span></div>
        <h4>Controls</h4>
        <div className="slider">
          <span>heartbeat ms</span>
          <input type="range" min="100" max="2000" step="50" value={state.heartbeatMs}
                 onChange={e=>setState(s=>({...s, heartbeatMs:+e.target.value}))}/>
        </div>
        <div className="slider">
          <span>lag budget ms</span>
          <input type="range" min="20" max="400" step="10" value={state.lagBudget}
                 onChange={e=>setState(s=>({...s, lagBudget:+e.target.value}))}/>
        </div>
        <div className="legend">
          <span><span className="dot ok"/> follower</span>
          <span><span className="dot warn"/> candidate</span>
          <span><span className="dot danger"/> suspect</span>
        </div>
      </div>

      <div className="main" onMouseMove={onMove} onMouseLeave={()=>{setHover(null); setTip(null);}}>
        <canvas ref={canvasRef} className="topo"/>
        {state.partitioned && <div className="split-banner">split brain active — minority side cannot elect</div>}
        <div className="quorum-banner">
          {stats.hasQuorum ? "quorum available" : "quorum lost"} · leaders {stats.leaders} · live {stats.live}/{state.nodes.length}
        </div>
        {tip && (
          <div className="tooltip" style={{ left: tip.x + 14, top: tip.y + 14 }}>
            <div className="t-title">{tip.node.id}</div>
            <div className="t-row"><span>role</span><b>{tip.node.role}</b></div>
            <div className="t-row"><span>state</span><b>{tip.node.state}</b></div>
            <div className="t-row"><span>term</span><b>{tip.node.term}</b></div>
            <div className="t-row"><span>lag</span><b>{tip.node.lagMs}ms</b></div>
            <div className="t-row"><span>inflight</span><b>{tip.node.inflight}</b></div>
          </div>
        )}
      </div>

      <div className="panel right">
        <h3>Selected Node · {sel.id}</h3>
        <div className="kpi">
          <div className="card">
            <div className="k">state</div>
            <div className={`v ${sel.state==="LEADER"?"ok":sel.suspect?"danger":""}`}>{sel.state}</div>
            <div className="sub">term {sel.term}</div>
          </div>
          <div className="card">
            <div className="k">heartbeat lag</div>
            <div className={`v ${sel.lagMs>100?"warn":"ok"}`}>{sel.lagMs}ms</div>
            <div className="sub">vs budget {state.lagBudget}ms</div>
          </div>
          <div className="card">
            <div className="k">inflight</div>
            <div className="v">{sel.inflight}</div>
            <div className="sub">replication queue</div>
          </div>
          <div className="card">
            <div className="k">load</div>
            <div className={`v ${sel.load>0.8?"warn":""}`}>{(sel.load*100).toFixed(0)}%</div>
            <div className="sub">cpu/io composite</div>
          </div>
        </div>
        <h4>Cluster Health</h4>
        <div className="row"><span className="k">live nodes</span><span className={`v ${stats.live<stats.quorumSize?"danger":"ok"}`}>{stats.live}/{state.nodes.length}</span></div>
        <div className="row"><span className="k">quorum</span><span className={`v ${stats.hasQuorum?"ok":"danger"}`}>{stats.hasQuorum?"present":"LOST"}</span></div>
        <div className="row"><span className="k">leader count</span><span className={`v ${stats.leaders>1?"danger":"ok"}`}>{stats.leaders}</span></div>
        <div className="row"><span className="k">avg lag</span><span className="v">{stats.lagAvg.toFixed(1)}ms</span></div>
        <div className="row"><span className="k">max lag</span><span className={`v ${stats.lagMax>300?"warn":""}`}>{stats.lagMax}ms</span></div>
        <h4>Tags</h4>
        <div>
          <span className="chip ok">heartbeat</span>
          <span className="chip">raft</span>
          <span className="chip">HLC</span>
          {state.partitioned && <span className="chip danger">split-brain</span>}
          {!stats.hasQuorum && <span className="chip danger">no-quorum</span>}
          {stats.leaders>1 && <span className="chip warn">dual-leader</span>}
        </div>
        <h4>Cluster Telemetry History</h4>
        <div style={{height:80,marginTop:4,border:"1px solid var(--border)"}}>
          <TimelineStrip series={history.length?history:[0,0]} color="#00d4ff"/>
        </div>
      </div>

      <div className="bottom">
        <div className="cell">
          <div className="section-title">Heartbeat Lag Distribution</div>
          <div style={{flex:1,minHeight:0,border:"1px solid var(--border)"}}>
            <HistoBar vals={lagSeries} color="#4fffa8" height="100%"/>
          </div>
          <div style={{fontSize:10,color:"var(--ink-dim)",marginTop:4}}>symlog-style bucketing · max {stats.lagMax}ms</div>
        </div>
        <div className="cell">
          <div className="section-title">Replication Inflight</div>
          <div style={{flex:1,minHeight:0,border:"1px solid var(--border)"}}>
            <HistoBar vals={inflightSeries} color="#00d4ff" height="100%"/>
          </div>
          <div style={{fontSize:10,color:"var(--ink-dim)",marginTop:4}}>backpressure depth per node</div>
        </div>
        <div className="cell">
          <div className="section-title">Election &amp; Discovery Log</div>
          <div className="scroll">
            <EventLog log={state.log}/>
          </div>
        </div>
      </div>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);