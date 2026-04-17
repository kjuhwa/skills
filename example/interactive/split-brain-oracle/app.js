// split-brain-oracle :: D3 v7
// obeys: quorum-visualization-off-by-one, time-unit-consistency-us-ms-ns,
//        symlog-for-lag-metrics-near-zero, arbitrary-display-caps-hide-signal

const W  = () => document.querySelector("#topo").clientWidth;
const H  = () => document.querySelector("#topo").clientHeight;

// ---------- state ----------
const state = {
  nodes: [],
  links: [],
  partitioned: false,
  paused: false,
  term: 1,
  leader: null,
  tick: 0,
  log: [],
  scenarios: [
    { name:"dual-leader-pair",         desc:"two halves each elect", sev:"ERR",   freq:12 },
    { name:"minority-island",          desc:"starves for quorum",    sev:"WARN",  freq:44 },
    { name:"flapping-follower",        desc:"heartbeat jitters",     sev:"WARN",  freq:78 },
    { name:"leader-lease-expiry",      desc:"soft pity crown",       sev:"INFO",  freq:90 },
    { name:"clock-skew-inversion",     desc:"HLC rescues",           sev:"WARN",  freq:18 },
    { name:"stale-heartbeat-echo",     desc:"delayed beat revives",  sev:"INFO",  freq:64 },
    { name:"rejoined-old-leader",      desc:"term steps down",       sev:"INFO",  freq:55 },
    { name:"circuit-breaker-open",     desc:"fan-out suppressed",    sev:"WARN",  freq:38 },
    { name:"bulkhead-saturation",      desc:"pool drained",          sev:"WARN",  freq:22 },
    { name:"registry-dns-flap",        desc:"Eureka re-registers",   sev:"INFO",  freq:60 },
    { name:"outbox-unpublished",       desc:"relay stuck",           sev:"WARN",  freq:15 },
    { name:"cdc-resume-gap",           desc:"stream resubscribe",    sev:"ERR",   freq:9  },
    { name:"dlq-growth-spike",         desc:"poison-record burst",   sev:"WARN",  freq:27 },
    { name:"saga-compensation",        desc:"pivot step reversed",   sev:"INFO",  freq:33 },
    { name:"retry-thundering-herd",    desc:"jitter missing",        sev:"ERR",   freq:7  },
    { name:"rebalance-storm",          desc:"max-poll breached",     sev:"ERR",   freq:5  },
    { name:"blue-green-drain",         desc:"idle fleet warms",      sev:"INFO",  freq:70 },
    { name:"canary-gate-noise",        desc:"low-volume SLO",        sev:"WARN",  freq:52 },
    { name:"strangler-shadow-drift",   desc:"legacy diverges",       sev:"WARN",  freq:24 },
    { name:"schema-incompatible",      desc:"consumer rejects",      sev:"ERR",   freq:11 },
    { name:"read-replica-lag-runup",   desc:"stale projections",     sev:"WARN",  freq:48 },
    { name:"consistent-hash-skew",     desc:"hot virtual bucket",    sev:"WARN",  freq:36 },
    { name:"bloom-false-positive",     desc:"drift vs reality",      sev:"INFO",  freq:82 },
    { name:"crdt-merge-storm",         desc:"concurrent edits",      sev:"INFO",  freq:69 },
    { name:"raft-term-step-down",      desc:"higher term learned",   sev:"INFO",  freq:58 },
    { name:"frozen-metric-detected",   desc:"sensor stuck",          sev:"WARN",  freq:29 },
    { name:"chaos-blast-minor",        desc:"drill ran clean",       sev:"INFO",  freq:88 },
    { name:"watermark-late-event",     desc:"window re-fires",       sev:"INFO",  freq:41 },
    { name:"hlc-logical-counter-bump", desc:"wall-clock tie",        sev:"INFO",  freq:75 },
    { name:"lantern-drift-warning",    desc:"fleet position shift",  sev:"INFO",  freq:86 },
    { name:"ttl-jitter-applied",       desc:"stampede avoided",      sev:"INFO",  freq:92 },
  ],
  selectedScenario: "dual-leader-pair",
};

// ---------- deterministic rng ----------
let seed = 0xC0FFEE;
const rng = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};

// ---------- factories ----------
const mkNode = (id, side) => ({
  id, side,
  name: `node-${id.toString().padStart(2,"0")}`,
  role: "follower",
  suspect: false,
  alive: true,
  term: state.term,
  lag: Math.floor(rng()*40),
  load: rng(),
  inflight: Math.floor(rng()*10),
});

const buildFleet = (n) => {
  state.nodes = d3.range(n).map(i => mkNode(i, i < n/2 ? "A" : "B"));
  // identify leader
  state.nodes[0].role = "leader";
  state.leader = state.nodes[0];
  state.links = [];
  for (let i = 1; i < n; i++) {
    state.links.push({ source: 0, target: i });
  }
};

const typeCmd = (txt) => {
  const el = document.getElementById("cmd-line");
  el.textContent = "";
  let i = 0;
  const step = () => {
    el.textContent = txt.slice(0, i++);
    if (i <= txt.length) setTimeout(step, 24);
  };
  step();
};

// ---------- log (arbitrary-display-caps-hide-signal: keep full buffer) ----------
const pushLog = (lvl, msg) => {
  state.log.push({ t: state.tick, lvl, msg });
  if (state.log.length > 2000) state.log.splice(0, state.log.length - 2000);
  renderLog();
};

const renderLog = () => {
  const container = d3.select("#log");
  const visible = state.log.slice(-140).reverse();
  // data join — enter/update/exit
  const rows = container.selectAll(".row").data(visible, (d,i) => state.log.length - 1 - i);
  const enter = rows.enter().append("div").attr("class","row");
  enter.append("span").attr("class","t").text(d => `${(d.t*0.1).toFixed(1)}s`);
  enter.append("span").attr("class", d => `lvl ${d.lvl}`).text(d => d.lvl);
  enter.append("span").text(d => d.msg);
  rows.exit().remove();
};

// ---------- force simulation ----------
let sim;
let svgTopo, gLinks, gNodes, gLabels, qRing, splitLine, leaderRing;

const initTopoLayer = () => {
  svgTopo = d3.select("#topo");
  svgTopo.selectAll("*").remove();
  const defs = svgTopo.append("defs");
  defs.append("radialGradient").attr("id","nodeGrad")
    .selectAll("stop").data([
      {o:"0%",  c:"#66ff66"},
      {o:"40%", c:"#33ff33"},
      {o:"100%",c:"#0a3f0a"},
    ]).enter().append("stop").attr("offset", d=>d.o).attr("stop-color", d=>d.c);

  qRing = svgTopo.append("g").attr("class","q-ring");
  leaderRing = svgTopo.append("g").attr("class","leader-ring");
  splitLine = svgTopo.append("line")
    .attr("class","split")
    .attr("stroke", "#ff3355")
    .attr("stroke-width", 1)
    .attr("stroke-dasharray", "6 4")
    .attr("opacity", 0);

  gLinks = svgTopo.append("g").attr("class","links");
  gNodes = svgTopo.append("g").attr("class","nodes");
  gLabels = svgTopo.append("g").attr("class","labels");
};

const restartSim = () => {
  sim = d3.forceSimulation(state.nodes)
    .force("charge", d3.forceManyBody().strength(-260))
    .force("center", d3.forceCenter(W()/2, H()/2))
    .force("collide", d3.forceCollide(22))
    .force("radial", d3.forceRadial(d => d.alive ? Math.min(W(),H())*0.32 : Math.min(W(),H())*0.45, W()/2, H()/2).strength(0.45))
    .force("side", d3.forceX(d => state.partitioned ? (d.side==="A" ? W()*0.33 : W()*0.67) : W()/2).strength(state.partitioned ? 0.5 : 0.1))
    .force("link", d3.forceLink(state.links).distance(110).strength(0.15))
    .alpha(0.8).alphaDecay(0.03)
    .on("tick", onTick);
};

const onTick = () => {
  const Wv = W(), Hv = H();
  const radius = Math.min(Wv, Hv)*0.34;

  // quorum rings
  const ringsData = state.partitioned ? [
    { cx: Wv*0.33, cy: Hv/2, r: radius*0.7 },
    { cx: Wv*0.67, cy: Hv/2, r: radius*0.7 },
  ] : [
    { cx: Wv/2, cy: Hv/2, r: radius },
  ];
  const rings = qRing.selectAll("circle").data(ringsData);
  rings.enter().append("circle")
    .attr("fill","none")
    .attr("stroke","#1a8f1a")
    .attr("stroke-dasharray","3 4")
    .attr("opacity", 0.55)
    .merge(rings)
    .attr("cx", d => d.cx)
    .attr("cy", d => d.cy)
    .attr("r", d => d.r);
  rings.exit().remove();

  splitLine
    .attr("x1", Wv/2).attr("x2", Wv/2)
    .attr("y1", 0).attr("y2", Hv)
    .attr("opacity", state.partitioned ? 0.55 : 0);

  // links (only leader → followers in leader's partition)
  const activeLinks = [];
  const leader = state.leader;
  if (leader && leader.alive) {
    state.nodes.forEach(n => {
      if (n === leader) return;
      if (!n.alive) return;
      if (state.partitioned && n.side !== leader.side) return;
      activeLinks.push({ source: leader, target: n });
    });
  }
  const link = gLinks.selectAll("line").data(activeLinks, d => d.target.id);
  link.enter().append("line")
    .attr("stroke","#33ff33")
    .attr("stroke-width",1)
    .attr("opacity",0.4)
    .merge(link)
    .attr("x1", d=>d.source.x).attr("y1",d=>d.source.y)
    .attr("x2", d=>d.target.x).attr("y2",d=>d.target.y)
    .attr("opacity", d=> d.target.suspect ? 0.1 : 0.45);
  link.exit().remove();

  // leader halo
  const halo = leaderRing.selectAll("circle").data(leader ? [leader] : []);
  halo.enter().append("circle")
    .attr("fill","none")
    .attr("stroke","#33ff33")
    .attr("stroke-width",1)
    .merge(halo)
    .attr("cx", d=>d.x).attr("cy", d=>d.y)
    .attr("r", 18 + Math.sin(state.tick*0.18)*4)
    .attr("opacity", 0.4);
  halo.exit().remove();

  // nodes
  const nodeSel = gNodes.selectAll("circle").data(state.nodes, d => d.id);
  const enter = nodeSel.enter().append("circle")
    .attr("r", 10).attr("fill", "url(#nodeGrad)")
    .attr("stroke","#33ff33").attr("stroke-width", 0.8)
    .on("click", (e,d) => killOne(d.id));
  enter.merge(nodeSel)
    .attr("cx", d=>d.x).attr("cy", d=>d.y)
    .attr("r", d => d.role==="leader" ? 13 : 9)
    .attr("fill", d => d.suspect ? "#331a1a" : "url(#nodeGrad)")
    .attr("stroke", d => d.suspect ? "#ff3355" : (d.role==="leader" ? "#aaffaa" : "#33ff33"))
    .attr("opacity", d => d.alive ? 1 : 0.2);
  nodeSel.exit().remove();

  // labels
  const lbl = gLabels.selectAll("text").data(state.nodes, d => d.id);
  lbl.enter().append("text")
    .attr("text-anchor","middle")
    .attr("font-size", 9)
    .attr("font-family", "ui-monospace, Menlo")
    .attr("fill", "#88ff88")
    .merge(lbl)
    .attr("x", d => d.x).attr("y", d => d.y + 22)
    .text(d => `${d.name}${d.role==="leader" ? " ★" : ""}`);
  lbl.exit().remove();
};

// ---------- heartbeat / election loop ----------
const simulate = () => {
  if (state.paused) return;
  state.tick += 1;
  // heartbeat-induced lag drift
  state.nodes.forEach(n => {
    n.lag = Math.max(0, Math.round(n.lag + (rng()-0.5) * 20));
    if (!n.alive) return;
    const hb = +document.getElementById("hb-val").textContent;
    n.suspect = n.lag > hb * 2;
  });

  // election
  const sides = state.partitioned ? ["A","B"] : ["X"];
  sides.forEach(side => {
    const group = state.partitioned
      ? state.nodes.filter(n => n.side === side)
      : state.nodes.filter(n => n.alive);
    const live = group.filter(n => n.alive && !n.suspect);
    const quorum = Math.floor(state.nodes.length / 2) + 1;
    const hasLeader = live.some(n => n.role === "leader");
    if (!hasLeader && live.length >= quorum) {
      const winner = live[Math.floor(rng()*live.length)];
      state.nodes.forEach(n => { if (n.role==="leader") n.role = "follower"; });
      winner.role = "leader";
      state.term += 1;
      winner.term = state.term;
      state.leader = winner;
      pushLog("ELECT", `${winner.name} crowned · term=${state.term} side=${side}`);
    } else if (!hasLeader) {
      pushLog("WARN", `side ${side} under quorum (live=${live.length}, need=${quorum})`);
    }
  });

  if (state.tick % 8 === 0 && state.leader) {
    pushLog("HB", `${state.leader.name} beat → ${state.nodes.filter(n=>n!==state.leader && n.alive).length} followers`);
  }

  updateStatusBar();
  sim.alpha(0.2).restart();
};

// ---------- controls ----------
const killOne = (id) => {
  const n = state.nodes.find(x => x.id === id);
  if (!n) return;
  n.alive = false; n.suspect = true;
  if (n.role === "leader") state.leader = null;
  pushLog("ERR", `${n.name} doused (manual)`);
};

const killRandom = () => {
  const alive = state.nodes.filter(n => n.alive);
  if (!alive.length) return;
  killOne(alive[Math.floor(rng()*alive.length)].id);
};

const addNode = () => {
  const id = state.nodes.length;
  const side = id < (state.nodes.length+1)/2 ? "A" : "B";
  const n = mkNode(id, side);
  state.nodes.push(n);
  if (state.leader) state.links.push({ source: state.leader.id, target: id });
  pushLog("INFO", `${n.name} joined registry`);
  restartSim();
};

const togglePartition = () => {
  state.partitioned = !state.partitioned;
  pushLog(state.partitioned ? "ERR" : "INFO",
    state.partitioned ? "network cleaver invoked — split brain" : "cleaver lifted — fleet reunited");
  document.getElementById("banner").classList.toggle("show", state.partitioned);
  document.getElementById("banner").textContent = state.partitioned ? "SPLIT BRAIN :: minority starves for quorum" : "";
  restartSim();
  typeCmd(state.partitioned ? "iptables -A FORWARD -s 10.0.1.0/24 -d 10.0.2.0/24 -j DROP" : "iptables -F FORWARD");
};

const reset = () => {
  const n = +document.getElementById("n-val").textContent;
  buildFleet(n);
  state.partitioned = false;
  state.term = 1;
  state.tick = 0;
  state.log = [];
  document.getElementById("banner").classList.remove("show");
  pushLog("INFO", `fleet reset · N=${n}`);
  restartSim();
  typeCmd(`systemctl restart quorum-oracle@N=${n}`);
};

// ---------- calc panel ----------
const latChart = d3.select("#lat-chart");
const qChart = d3.select("#q-chart");

const renderCharts = () => {
  const hb = +document.getElementById("hb-val").textContent;
  const et = +document.getElementById("et-val").textContent;
  const rtt = +document.getElementById("rtt-val").textContent;

  // worst-case election latency vs N: et + log2(N)*rtt  (illustrative)
  const Ns = d3.range(3, 31, 2);
  const width = latChart.node().clientWidth;
  const height = 110;
  const x = d3.scaleLinear().domain([3,30]).range([30, width-10]);
  const y = d3.scaleLinear().domain([0, d3.max(Ns, n => et + Math.log2(n)*rtt + hb*2)]).range([height-20, 8]);
  const data = Ns.map(n => ({ n, lat: et + Math.log2(n)*rtt + hb*2 }));

  latChart.selectAll("*").remove();
  latChart.append("g").attr("transform", `translate(0,${height-20})`)
    .call(d3.axisBottom(x).ticks(6).tickSize(-height+28))
    .call(g => g.selectAll("line").attr("stroke","#1a3f1a"))
    .call(g => g.selectAll("text").attr("fill","#447744").attr("font-family","ui-monospace"));
  latChart.append("g").attr("transform", `translate(30,0)`)
    .call(d3.axisLeft(y).ticks(4))
    .call(g => g.selectAll("line").attr("stroke","#1a3f1a"))
    .call(g => g.selectAll("text").attr("fill","#447744").attr("font-family","ui-monospace"));
  const line = d3.line().x(d => x(d.n)).y(d => y(d.lat)).curve(d3.curveMonotoneX);
  latChart.append("path").datum(data)
    .attr("fill","none").attr("stroke","#33ff33").attr("stroke-width",1.5)
    .attr("d", line)
    .attr("stroke-dasharray", function() { const l = this.getTotalLength(); return `${l} ${l}`; })
    .attr("stroke-dashoffset", function() { return this.getTotalLength(); })
    .transition().duration(700).attr("stroke-dashoffset", 0);
  latChart.selectAll("circle.dot").data(data).enter().append("circle")
    .attr("class","dot").attr("r",2.5).attr("fill","#aaffaa")
    .attr("cx", d=>x(d.n)).attr("cy", d=>y(d.lat));

  // quorum thresholds
  const qW = qChart.node().clientWidth;
  const Ns2 = d3.range(3, 31);
  const simple  = Ns2.map(n => ({ n, q: Math.floor(n/2)+1 }));
  const byz     = Ns2.map(n => ({ n, q: Math.floor(2*n/3)+1 }));
  const qx = d3.scaleLinear().domain([3,30]).range([30, qW-10]);
  const qy = d3.scaleLinear().domain([0, d3.max(byz, d => d.q)+2]).range([height-20, 8]);

  qChart.selectAll("*").remove();
  qChart.append("g").attr("transform", `translate(0,${height-20})`)
    .call(d3.axisBottom(qx).ticks(6).tickSize(-height+28))
    .call(g => g.selectAll("line").attr("stroke","#1a3f1a"))
    .call(g => g.selectAll("text").attr("fill","#447744").attr("font-family","ui-monospace"));
  qChart.append("g").attr("transform",`translate(30,0)`)
    .call(d3.axisLeft(qy).ticks(4))
    .call(g => g.selectAll("line").attr("stroke","#1a3f1a"))
    .call(g => g.selectAll("text").attr("fill","#447744").attr("font-family","ui-monospace"));
  const qLine = d3.line().x(d=>qx(d.n)).y(d=>qy(d.q)).curve(d3.curveStepAfter);
  qChart.append("path").datum(simple)
    .attr("fill","none").attr("stroke","#33ff33").attr("stroke-width",1.3).attr("d", qLine);
  qChart.append("path").datum(byz)
    .attr("fill","none").attr("stroke","#ffbb33").attr("stroke-width",1.3).attr("stroke-dasharray","4 3").attr("d", qLine);
  qChart.append("text").attr("x",qW-60).attr("y",16).attr("fill","#33ff33").attr("font-size",10).text("⌊n/2⌋+1");
  qChart.append("text").attr("x",qW-60).attr("y",30).attr("fill","#ffbb33").attr("font-size",10).text("⌊2n/3⌋+1");
};

const renderCalcText = () => {
  const n  = +document.getElementById("n-val").textContent;
  const hb = +document.getElementById("hb-val").textContent;
  const et = +document.getElementById("et-val").textContent;
  const rtt= +document.getElementById("rtt-val").textContent;
  const qs = Math.floor(n/2) + 1;
  const qb = Math.floor(2*n/3) + 1;
  const survivable = n - qs;
  // divide-by-zero-rate-guard
  const electWorst = et + Math.log2(Math.max(2,n)) * rtt + hb * 2;
  const lines = [
    `> fleet             : ${n} nodes`,
    `> simple quorum     : ⌊${n}/2⌋+1 = ${qs} (survives ${survivable} down)`,
    `> byzantine quorum  : ⌊2·${n}/3⌋+1 = ${qb}`,
    `> heartbeat budget  : ${hb}ms  (suspect @ ${hb*2}ms)`,
    `> election timeout  : ${et}ms`,
    `> rtt p99           : ${rtt}ms`,
    `> worst elect time  : ~${electWorst.toFixed(0)}ms  [et + log2(N)·rtt + 2·hb]`,
    `> split-brain safe  : ${(qs*2) > n ? "YES — only one side can elect" : "NO — tie possible"}`,
  ];
  document.getElementById("calc-out").textContent = lines.join("\n");
};

// ---------- scenarios ledger ----------
const renderScenarios = () => {
  const svg = d3.select("#scenarios");
  const w = svg.node().clientWidth;
  const h = svg.node().clientHeight;
  const rowH = 18;
  const rows = state.scenarios;
  const x = d3.scaleLinear().domain([0, 100]).range([180, w-20]);

  svg.selectAll("*").remove();
  const group = svg.selectAll("g.scenario-row").data(rows, d=>d.name);
  const enter = group.enter().append("g")
    .attr("class","scenario-row")
    .attr("transform",(d,i)=>`translate(0,${i*rowH+14})`)
    .on("click",(e,d)=>{
      state.selectedScenario = d.name;
      pushLog("INFO", `scenario :: ${d.name} — ${d.desc}`);
      renderScenarios();
      typeCmd(`oracle --replay ${d.name}`);
    });

  enter.append("text")
    .attr("x", 8).attr("y", 10)
    .attr("fill","#88ff88")
    .attr("font-family","ui-monospace")
    .attr("font-size",10)
    .text(d => d.name);

  enter.append("rect")
    .attr("class","scenario-bar")
    .attr("x", d => x(0))
    .attr("y", 2)
    .attr("height", 10)
    .attr("rx", 1)
    .attr("width", 0);

  enter.append("text")
    .attr("class","sev")
    .attr("x", w-12).attr("y", 10)
    .attr("text-anchor","end")
    .attr("font-size",10)
    .attr("fill", d => d.sev==="ERR" ? "#ff3355" : d.sev==="WARN" ? "#ffbb33" : "#33ffee")
    .text(d => d.sev);

  svg.selectAll("g.scenario-row")
    .select("rect.scenario-bar")
    .classed("active", d => d.name === state.selectedScenario)
    .transition().duration(600)
    .attr("width", d => x(d.freq) - x(0))
    .attr("fill", d => d.name === state.selectedScenario ? "#33ff33" : "#1a8f1a");
};

// ---------- status bar ----------
const updateStatusBar = () => {
  const n = state.nodes.length;
  const q = Math.floor(n/2)+1;
  document.getElementById("sb-fleet").textContent = `fleet=${n}`;
  document.getElementById("sb-quorum").textContent = `Q=⌊n/2⌋+1=${q}`;
  document.getElementById("sb-leader").textContent = state.leader ? `leader=${state.leader.name}` : "leader=—";
  document.getElementById("sb-partition").textContent = `partition=${state.partitioned?"on":"off"}`;
  document.getElementById("sb-term").textContent = `term=${state.term}`;
};

// ---------- bindings ----------
const ranges = ["n","hb","et","rtt"];
ranges.forEach(key => {
  const el = document.getElementById(`${key}-range`);
  const v = document.getElementById(`${key}-val`);
  el.addEventListener("input", () => {
    v.textContent = el.value;
    renderCalcText();
    renderCharts();
    if (key === "n") {
      buildFleet(+el.value);
      restartSim();
      pushLog("INFO", `fleet resized to ${el.value}`);
    }
  });
});

document.getElementById("btn-partition").addEventListener("click", togglePartition);
document.getElementById("btn-heal").addEventListener("click", () => {
  if (state.partitioned) togglePartition();
});
document.getElementById("btn-kill").addEventListener("click", killRandom);
document.getElementById("btn-add").addEventListener("click", addNode);
document.getElementById("btn-reset").addEventListener("click", reset);

window.addEventListener("keydown", e => {
  if (e.key === " ") { e.preventDefault(); state.paused = !state.paused; pushLog("INFO", state.paused ? "paused" : "resumed"); }
  if (e.key === "p") togglePartition();
  if (e.key === "k") killRandom();
  if (e.key === "a") addNode();
  if (e.key === "r") reset();
  if (e.key === "s") {
    const pick = state.scenarios[Math.floor(Math.random()*state.scenarios.length)];
    state.selectedScenario = pick.name;
    pushLog("INFO", `scenario :: ${pick.name} — ${pick.desc}`);
    renderScenarios();
    typeCmd(`oracle --replay ${pick.name}`);
  }
});

window.addEventListener("resize", () => {
  renderCharts();
  restartSim();
});

// ---------- boot ----------
buildFleet(+document.getElementById("n-val").textContent);
initTopoLayer();
restartSim();
renderCalcText();
renderCharts();
renderScenarios();
updateStatusBar();
pushLog("INFO", "oracle online · awaiting orders");
typeCmd("oracle --attach prod/fleet --watch quorum --listen 0.0.0.0:9292");

setInterval(simulate, 380);