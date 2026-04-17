// Byzantine Causality Atlas
// Vector clocks + Lamport timestamps + BFT quorum drift visualizer

const N_REPLICAS = 7;  // 3f+1 tolerance for f=2
const RID = ['A','B','C','D','E','F','G'];

// ---------- Deterministic PRNG (FNV1a + xorshift32) ----------
function fnv1a(str){ let h = 0x811c9dc5; for (let i=0;i<str.length;i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193);} return h>>>0; }
function xorshift32(seed){ let s = seed>>>0 || 1; return () => { s ^= s<<13; s ^= s>>>17; s ^= s<<5; return (s>>>0)/4294967295; }; }
const seedBase = fnv1a('byzantine-causality-atlas-' + Date.now());
const rand = xorshift32(seedBase);

// ---------- State ----------
const state = {
  tick: 0,
  autoPlay: false,
  view: 'constellation',
  replicas: [],
  events: [],
  edges: [],
  proposals: [],
  signatures: [],
  partitions: new Set(),
  strategy: 'lww',
};

function initReplicas(){
  state.replicas = RID.slice(0, N_REPLICAS).map((id, i) => ({
    id, idx: i,
    angle: (i / N_REPLICAS) * Math.PI * 2,
    vc: Array(N_REPLICAS).fill(0),
    lamport: 0,
    faulty: false,
    partitioned: false,
    pending: [],
    log: [],
    payload: {},   // for conflict demo
    phase: rand() * Math.PI * 2,
  }));
}

// ---------- Vector Clock ops ----------
function vcMerge(a, b){
  const r = a.slice();
  for (let i=0;i<r.length;i++) r[i] = Math.max(r[i], b[i]);
  return r;
}
function vcCompare(a, b){
  let lt=false, gt=false;
  for (let i=0;i<a.length;i++){
    if (a[i] < b[i]) lt = true;
    if (a[i] > b[i]) gt = true;
  }
  if (lt && !gt) return -1;
  if (gt && !lt) return 1;
  if (!lt && !gt) return 0;
  return 2; // concurrent
}
function vcStr(v){ return '[' + v.join(',') + ']'; }

// ---------- Event generation ----------
function stepTick(){
  state.tick++;
  const senderIdx = Math.floor(rand() * N_REPLICAS);
  const sender = state.replicas[senderIdx];
  // local event
  sender.lamport++;
  sender.vc[senderIdx]++;
  const lamportGlobal = Math.max(...state.replicas.map(r=>r.lamport));
  const evt = {
    tick: state.tick, kind: 'local', from: sender.id, to: null,
    vc: sender.vc.slice(), lamport: sender.lamport, faulty: sender.faulty,
  };
  sender.log.push(evt);
  state.events.push(evt);

  // decide whether to broadcast or partition-isolate
  for (const r of state.replicas){
    if (r === sender) continue;
    const edgeKey = [sender.id, r.id].sort().join('-');
    if (state.partitions.has(edgeKey)) continue;
    // send message
    const msg = { from: sender.id, to: r.id, vc: sender.vc.slice(),
      lamport: sender.lamport, faulty: sender.faulty,
      value: Math.floor(rand()*1000), sent: state.tick };
    if (sender.faulty && rand() < 0.4){
      // Byzantine: corrupt own VC downwards or fabricate
      msg.vc = msg.vc.map(v => Math.max(0, v - Math.floor(rand()*3)));
      msg.faulty = true;
    }
    r.pending.push(msg);
  }

  // deliver pending in random order (network delay) — concurrent edges emerge
  for (const r of state.replicas){
    if (rand() < 0.55 && r.pending.length){
      const m = r.pending.shift();
      // deliver
      r.lamport = Math.max(r.lamport, m.lamport) + 1;
      const oldVc = r.vc.slice();
      r.vc = vcMerge(r.vc, m.vc);
      r.vc[r.idx]++;  // receive event increments own
      const recv = {
        tick: state.tick, kind: 'recv', from: m.from, to: r.id,
        vc: r.vc.slice(), lamport: r.lamport, faulty: m.faulty,
      };
      r.log.push(recv);
      state.events.push(recv);
      state.edges.push({ from: m.from, to: r.id, atTick: state.tick,
        cmp: vcCompare(oldVc, m.vc), faulty: m.faulty });
    }
  }

  if (state.tick % 5 === 0) driveQuorum();
  if (state.events.length > 400) state.events = state.events.slice(-300);
  if (state.edges.length > 400) state.edges = state.edges.slice(-300);

  render();
}

// ---------- Byzantine Quorum (PBFT-flavored) ----------
function driveQuorum(){
  const proposer = state.replicas[Math.floor(rand()*N_REPLICAS)];
  const value = 'cmd:' + Math.floor(rand()*9999).toString(16);
  const prop = { id: 'P' + state.proposals.length, proposer: proposer.id,
    value, tick: state.tick, prepares: [], commits: [],
    decision: 'pending' };
  // pre-prepare broadcast, each replica votes unless faulty or partitioned
  const f = Math.floor((N_REPLICAS - 1) / 3); // f=2 for 7
  const need = 2 * f + 1;
  for (const r of state.replicas){
    const isolated = state.partitions.size > 0 &&
      [...state.partitions].some(e => e.split('-').includes(r.id));
    if (r.faulty){
      if (rand() < 0.5) prop.prepares.push({ r: r.id, sig: 'bad', bad: true });
      else prop.commits.push({ r: r.id, sig: 'bad', bad: true });
    } else if (!isolated) {
      prop.prepares.push({ r: r.id, sig: sigFor(r.id, prop.id) });
      if (rand() < 0.85) prop.commits.push({ r: r.id, sig: sigFor(r.id, prop.id + ':c') });
    }
  }
  const validCommits = prop.commits.filter(c => !c.bad).length;
  prop.decision = validCommits >= need ? 'accepted' :
    (validCommits >= f + 1 ? 'quorum' : 'rejected');
  prop.need = need; prop.f = f; prop.validCommits = validCommits;
  state.proposals.unshift(prop);
  if (state.proposals.length > 20) state.proposals.pop();

  state.signatures.push({ tick: state.tick, propId: prop.id,
    valid: validCommits, need, decision: prop.decision });
  if (state.signatures.length > 40) state.signatures.shift();
}
function sigFor(r, m){
  const h = fnv1a(r + ':' + m + ':' + seedBase);
  return h.toString(16).slice(0,8);
}

// ---------- Partition controls ----------
function injectPartition(){
  const a = Math.floor(rand()*N_REPLICAS);
  let b = Math.floor(rand()*N_REPLICAS);
  if (a === b) b = (b+1) % N_REPLICAS;
  const key = [RID[a], RID[b]].sort().join('-');
  state.partitions.add(key);
  state.replicas[a].partitioned = true;
  state.replicas[b].partitioned = true;
  state.events.push({ tick: state.tick, kind: 'partition', edge: key });
}
function heal(){
  state.partitions.clear();
  state.replicas.forEach(r => r.partitioned = false);
  state.events.push({ tick: state.tick, kind: 'heal' });
}
function forgeFaulty(){
  const healthy = state.replicas.filter(r => !r.faulty);
  if (!healthy.length) return;
  const target = healthy[Math.floor(rand() * healthy.length)];
  target.faulty = true;
  state.events.push({ tick: state.tick, kind: 'forge', r: target.id });
}
function resetAll(){
  state.tick = 0; state.events = []; state.edges = [];
  state.proposals = []; state.signatures = [];
  state.partitions.clear();
  initReplicas();
  seedConflictData();
  render();
}

// ---------- Conflict inspector data ----------
function seedConflictData(){
  // Replica A and B develop concurrent updates on the same key set
  state.replicas[0].payload = { counter: 3, set: ['alpha','beta'],
    reg: { value: 'first', vc: [1,0,0,0,0,0,0] } };
  state.replicas[1].payload = { counter: 5, set: ['beta','gamma'],
    reg: { value: 'second', vc: [0,2,0,0,0,0,0] } };
}

function resolve(){
  const A = state.replicas[0].payload;
  const B = state.replicas[1].payload;
  let out = {};
  if (state.strategy === 'lww'){
    const cmp = vcCompare(A.reg.vc, B.reg.vc);
    out = { value: cmp === -1 ? B.reg.value : cmp === 1 ? A.reg.value :
      (A.reg.value < B.reg.value ? B.reg.value : A.reg.value),
      note: cmp === 2 ? 'concurrent — tiebreak by lexicographic' :
        'causal dominance' };
  } else if (state.strategy === 'orset'){
    out = { set: [...new Set([...A.set, ...B.set])].sort(),
      note: 'OR-set union' };
  } else if (state.strategy === 'gcounter'){
    out = { counter: A.counter + B.counter, note: 'grow-only counter sum' };
  } else {
    out = { mv: [{ vc: A.reg.vc, value: A.reg.value },
      { vc: B.reg.vc, value: B.reg.value }],
      note: 'concurrent writes preserved' };
  }
  return out;
}

// ---------- Rendering ----------
const cc = document.getElementById('constellationCanvas');
const cctx = cc.getContext('2d');
const csvg = document.getElementById('constellationSvg');
const tlc = document.getElementById('timelineCanvas');
const tlctx = tlc.getContext('2d');
const qrc = document.getElementById('quorumCanvas');
const qrctx = qrc.getContext('2d');

function render(){
  document.getElementById('tickReadout').textContent = 'tick ' + state.tick;
  document.getElementById('seedReadout').textContent =
    'seed 0x' + seedBase.toString(16);
  if (state.view === 'constellation') renderConstellation();
  if (state.view === 'timeline') renderTimeline();
  if (state.view === 'quorum') renderQuorum();
  if (state.view === 'conflict') renderConflict();
  renderSide();
}

function renderConstellation(){
  const W = cc.width, H = cc.height;
  cctx.fillStyle = 'rgba(15,17,23,0.35)';
  cctx.fillRect(0,0,W,H);
  const cx = W/2, cy = H/2, R = Math.min(W,H)/2 - 70;
  // partition ring backdrop
  cctx.strokeStyle = '#2c3040';
  cctx.setLineDash([4,6]);
  cctx.beginPath(); cctx.arc(cx,cy,R,0,Math.PI*2); cctx.stroke();
  cctx.setLineDash([]);
  // edges — incommensurate sine flicker for organic feel
  for (const e of state.edges.slice(-100)){
    const a = state.replicas.find(r => r.id === e.from);
    const b = state.replicas.find(r => r.id === e.to);
    if (!a || !b) continue;
    const ax = cx + Math.cos(a.angle)*R, ay = cy + Math.sin(a.angle)*R;
    const bx = cx + Math.cos(b.angle)*R, by = cy + Math.sin(b.angle)*R;
    const age = (state.tick - e.atTick);
    const alpha = Math.max(0, 0.7 - age*0.04);
    if (alpha <= 0) continue;
    cctx.strokeStyle = e.faulty
      ? `rgba(239,122,122,${alpha})`
      : e.cmp === 2 ? `rgba(244,193,122,${alpha})`
      : `rgba(110,231,183,${alpha})`;
    cctx.lineWidth = 1.2;
    cctx.beginPath(); cctx.moveTo(ax,ay);
    const mx = (ax+bx)/2 + Math.sin(state.tick*0.1 + e.atTick)*20;
    const my = (ay+by)/2 + Math.cos(state.tick*0.07 + e.atTick)*20;
    cctx.quadraticCurveTo(mx,my,bx,by); cctx.stroke();
  }
  // replicas
  for (const r of state.replicas){
    const x = cx + Math.cos(r.angle)*R, y = cy + Math.sin(r.angle)*R;
    const pulse = 4 + Math.sin(state.tick*0.2 + r.phase)*2
      + Math.sin(state.tick*0.13 + r.phase*1.7)*1.5;
    cctx.beginPath();
    cctx.fillStyle = r.faulty ? '#ef7a7a' : r.partitioned ? '#f4c17a' : '#6ee7b7';
    cctx.shadowColor = cctx.fillStyle; cctx.shadowBlur = 16 + pulse;
    cctx.arc(x, y, 14 + pulse*0.4, 0, Math.PI*2);
    cctx.fill();
    cctx.shadowBlur = 0;
    cctx.fillStyle = '#0f1117';
    cctx.font = 'bold 14px ui-monospace';
    cctx.textAlign = 'center'; cctx.textBaseline = 'middle';
    cctx.fillText(r.id, x, y);
    // VC readout
    cctx.fillStyle = '#d6dae4';
    cctx.font = '10px ui-monospace';
    const labelR = R + 34;
    const lx = cx + Math.cos(r.angle)*labelR;
    const ly = cy + Math.sin(r.angle)*labelR;
    cctx.fillText(vcStr(r.vc), lx, ly);
    cctx.fillStyle = '#6b7080';
    cctx.fillText('L=' + r.lamport, lx, ly + 12);
  }
  // partitions as red X
  csvg.innerHTML = '';
  for (const edge of state.partitions){
    const [ia, ib] = edge.split('-');
    const a = state.replicas.find(r => r.id === ia);
    const b = state.replicas.find(r => r.id === ib);
    if (!a || !b) continue;
    const ax = cx + Math.cos(a.angle)*R, ay = cy + Math.sin(a.angle)*R;
    const bx = cx + Math.cos(b.angle)*R, by = cy + Math.sin(b.angle)*R;
    const mx = (ax+bx)/2, my = (ay+by)/2;
    const x1 = document.createElementNS('http://www.w3.org/2000/svg','line');
    x1.setAttribute('x1', mx-8); x1.setAttribute('y1', my-8);
    x1.setAttribute('x2', mx+8); x1.setAttribute('y2', my+8);
    x1.setAttribute('stroke','#ef7a7a'); x1.setAttribute('stroke-width','3');
    const x2 = document.createElementNS('http://www.w3.org/2000/svg','line');
    x2.setAttribute('x1', mx-8); x2.setAttribute('y1', my+8);
    x2.setAttribute('x2', mx+8); x2.setAttribute('y2', my-8);
    x2.setAttribute('stroke','#ef7a7a'); x2.setAttribute('stroke-width','3');
    csvg.appendChild(x1); csvg.appendChild(x2);
  }
}

function renderTimeline(){
  const W = tlc.width, H = tlc.height;
  tlctx.fillStyle = '#0f1117'; tlctx.fillRect(0,0,W,H);
  const laneH = H / N_REPLICAS;
  // lane backgrounds
  for (let i=0;i<N_REPLICAS;i++){
    tlctx.fillStyle = i%2 ? 'rgba(36,40,55,0.4)' : 'rgba(26,29,39,0.4)';
    tlctx.fillRect(0, i*laneH, W, laneH);
    tlctx.fillStyle = '#6ee7b7';
    tlctx.font = 'bold 12px ui-monospace';
    tlctx.textAlign = 'left';
    tlctx.fillText(RID[i], 8, i*laneH + laneH/2 + 4);
  }
  const recent = state.events.filter(e => e.kind !== 'partition'
    && e.kind !== 'heal' && e.kind !== 'forge').slice(-150);
  if (!recent.length) return;
  const minT = recent[0].tick, maxT = recent[recent.length-1].tick;
  const span = Math.max(1, maxT - minT);
  for (const e of recent){
    const x = 40 + ((e.tick - minT) / span) * (W - 60);
    const senderIdx = RID.indexOf(e.from);
    const receiverIdx = e.to ? RID.indexOf(e.to) : senderIdx;
    const y1 = senderIdx * laneH + laneH/2;
    const y2 = receiverIdx * laneH + laneH/2;
    if (e.kind === 'recv'){
      tlctx.strokeStyle = e.faulty ? '#ef7a7a' : '#6ee7b7';
      tlctx.lineWidth = 1;
      tlctx.beginPath();
      tlctx.moveTo(x - 8, y1);
      tlctx.lineTo(x, y2);
      tlctx.stroke();
    }
    tlctx.fillStyle = e.faulty ? '#ef7a7a' :
      e.kind === 'recv' ? '#f4c17a' : '#6ee7b7';
    tlctx.beginPath();
    tlctx.arc(x, y2, 4, 0, Math.PI*2); tlctx.fill();
  }
  // scrub axis
  tlctx.strokeStyle = '#2c3040';
  tlctx.beginPath(); tlctx.moveTo(40, H-18); tlctx.lineTo(W-20, H-18); tlctx.stroke();
  tlctx.fillStyle = '#6b7080';
  tlctx.font = '10px ui-monospace';
  tlctx.fillText('t=' + minT, 40, H-4);
  tlctx.fillText('t=' + maxT, W-60, H-4);
}

function renderQuorum(){
  const W = qrc.width, H = qrc.height;
  qrctx.fillStyle = '#0f1117'; qrctx.fillRect(0,0,W,H);
  const cx = W/2, cy = H/2, R = 180;
  // replica ring
  for (const r of state.replicas){
    const x = cx + Math.cos(r.angle)*R, y = cy + Math.sin(r.angle)*R;
    qrctx.fillStyle = r.faulty ? '#ef7a7a' : '#6ee7b7';
    qrctx.beginPath(); qrctx.arc(x,y,10,0,Math.PI*2); qrctx.fill();
    qrctx.fillStyle = '#0f1117';
    qrctx.font = 'bold 12px ui-monospace';
    qrctx.textAlign='center'; qrctx.textBaseline='middle';
    qrctx.fillText(r.id, x, y);
  }
  // latest proposal votes
  const p = state.proposals[0];
  if (p){
    qrctx.strokeStyle = '#6ee7b7';
    for (const c of p.commits){
      if (c.bad) continue;
      const r = state.replicas.find(rr => rr.id === c.r);
      if (!r) continue;
      const x = cx + Math.cos(r.angle)*R, y = cy + Math.sin(r.angle)*R;
      qrctx.beginPath(); qrctx.moveTo(cx,cy); qrctx.lineTo(x,y); qrctx.stroke();
    }
    // center decision
    qrctx.fillStyle = p.decision === 'accepted' ? '#6ee7b7' :
      p.decision === 'quorum' ? '#f4c17a' : '#ef7a7a';
    qrctx.shadowColor = qrctx.fillStyle; qrctx.shadowBlur = 30;
    qrctx.beginPath(); qrctx.arc(cx,cy,28,0,Math.PI*2); qrctx.fill();
    qrctx.shadowBlur = 0;
    qrctx.fillStyle = '#0f1117';
    qrctx.font = 'bold 11px ui-monospace';
    qrctx.fillText(p.decision, cx, cy-4);
    qrctx.fillText(p.validCommits + '/' + p.need, cx, cy+10);
  }
  // threshold bar
  qrctx.fillStyle = '#6b7080';
  qrctx.font = '11px ui-monospace';
  qrctx.textAlign = 'left';
  qrctx.fillText('N=' + N_REPLICAS + '  f=' + Math.floor((N_REPLICAS-1)/3)
    + '  need 2f+1=' + (2*Math.floor((N_REPLICAS-1)/3)+1), 20, H-20);
}

function renderConflict(){
  const A = state.replicas[0].payload;
  const B = state.replicas[1].payload;
  document.getElementById('replicaA').textContent = JSON.stringify({
    id: 'A', vc: state.replicas[0].vc, lamport: state.replicas[0].lamport,
    payload: A }, null, 2);
  document.getElementById('replicaB').textContent = JSON.stringify({
    id: 'B', vc: state.replicas[1].vc, lamport: state.replicas[1].lamport,
    payload: B }, null, 2);
  const merged = resolve();
  document.getElementById('mergeOut').textContent = JSON.stringify(merged, null, 2);
  const cmp = vcCompare(state.replicas[0].vc, state.replicas[1].vc);
  const ord = cmp === -1 ? 'A → B (A happens-before B)' :
    cmp === 1 ? 'B → A (B happens-before A)' :
    cmp === 0 ? 'A ≡ B (equal vector clocks)' :
    'A ∥ B (concurrent — no causal order)';
  document.getElementById('causalOrder').textContent = ord;
  document.getElementById('driftMetrics').innerHTML =
    `strategy: <b>${state.strategy}</b><br>` +
    `vc drift: ${Math.abs(state.replicas[0].vc.reduce((a,b)=>a+b,0)
      - state.replicas[1].vc.reduce((a,b)=>a+b,0))}<br>` +
    `lamport gap: ${Math.abs(state.replicas[0].lamport - state.replicas[1].lamport)}`;
}

function renderSide(){
  // Replica list
  const rl = document.getElementById('replicaList');
  if (rl) rl.innerHTML = state.replicas.map(r => `
    <div class="replica ${r.faulty?'faulty':''} ${r.partitioned?'partitioned':''}">
      <div class="chip"></div>
      <div>${r.id} <span style="color:#6b7080">L=${r.lamport}</span></div>
      <div style="color:#6b7080">${vcStr(r.vc)}</div>
    </div>`).join('');
  const lr = document.getElementById('lamportReadout');
  if (lr) lr.textContent = state.replicas
    .map(r => r.id + '=' + r.lamport).join(' · ');
  const vs = document.getElementById('vectorSnapshot');
  if (vs) vs.textContent = state.replicas
    .map(r => r.id + ' ' + vcStr(r.vc)).join('\n');

  // Event feed
  const ef = document.getElementById('eventFeed');
  if (ef){
    ef.innerHTML = state.events.slice(-30).reverse().map(e => {
      const cls = e.faulty ? 'faulty' :
        (e.kind === 'partition' || e.kind === 'heal') ? 'partition' : '';
      const label = e.kind === 'local'
        ? `t${e.tick} ${e.from} local ${vcStr(e.vc)} L=${e.lamport}`
        : e.kind === 'recv'
        ? `t${e.tick} ${e.from}→${e.to} ${vcStr(e.vc)} L=${e.lamport}`
        : e.kind === 'partition' ? `t${e.tick} PARTITION ${e.edge}`
        : e.kind === 'heal' ? `t${e.tick} HEAL all`
        : e.kind === 'forge' ? `t${e.tick} FORGE ${e.r}`
        : JSON.stringify(e);
      return `<li class="${cls}">${label}</li>`;
    }).join('');
  }
  const ce = document.getElementById('causalEdges');
  if (ce){
    const concurrent = state.edges.filter(e => e.cmp === 2).length;
    const faulty = state.edges.filter(e => e.faulty).length;
    ce.innerHTML = `happens-before: ${state.edges.length - concurrent - faulty}<br>` +
      `concurrent: ${concurrent}<br>faulty: ${faulty}`;
  }

  // Proposals
  const pl = document.getElementById('proposalList');
  if (pl){
    pl.innerHTML = state.proposals.slice(0,8).map(p => `
      <div class="proposal ${p.decision}">
        <b>${p.id}</b> @t${p.tick} by ${p.proposer}<br>
        <span style="color:#6b7080">${p.value}</span><br>
        commits: ${p.validCommits}/${p.need} (f=${p.f}) → ${p.decision}
      </div>`).join('');
  }
  const fb = document.getElementById('faultBudget');
  if (fb){
    const faulty = state.replicas.filter(r => r.faulty).length;
    const f = Math.floor((N_REPLICAS - 1)/3);
    fb.innerHTML = `N=${N_REPLICAS}, f=${f}<br>` +
      `faulty now: <b style="color:${faulty>f?'#ef7a7a':'#6ee7b7'}">${faulty}</b><br>` +
      `safety: ${faulty <= f ? 'HOLDS' : 'VIOLATED'}`;
  }
  const sl = document.getElementById('sigLog');
  if (sl){
    sl.innerHTML = state.signatures.slice(-12).reverse()
      .map(s => `t${s.tick} ${s.propId} ${s.valid}/${s.need} ${s.decision}`)
      .join('<br>');
  }
}

// ---------- Events ----------
document.querySelectorAll('.tab').forEach(t => {
  t.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
    document.querySelectorAll('.view').forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    state.view = t.dataset.view;
    document.getElementById(state.view).classList.add('active');
    render();
  });
});
document.getElementById('stepBtn').onclick = stepTick;
document.getElementById('playBtn').onclick = () => {
  state.autoPlay = !state.autoPlay;
  document.getElementById('playBtn').textContent = state.autoPlay ? 'Pause' : 'Auto';
};
document.getElementById('partitionBtn').onclick = () => { injectPartition(); render(); };
document.getElementById('healBtn').onclick = () => { heal(); render(); };
document.getElementById('forgeBtn').onclick = () => { forgeFaulty(); render(); };
document.getElementById('resetBtn').onclick = resetAll;
document.getElementById('strategy').onchange = e => {
  state.strategy = e.target.value; render();
};
document.getElementById('resolveBtn').onclick = render;
window.addEventListener('keydown', e => {
  if (e.code === 'Space'){ e.preventDefault(); stepTick(); }
  if (e.key === 'p' || e.key === 'P'){ injectPartition(); render(); }
  if (e.key === 'h' || e.key === 'H'){ heal(); render(); }
  if (e.key === 'f' || e.key === 'F'){ forgeFaulty(); render(); }
});

setInterval(() => { if (state.autoPlay) stepTick(); }, 600);

initReplicas();
seedConflictData();
render();