// Lamport Abacus Forge — event log → clocks + conflict resolution
const SAMPLE = [
  't=1 A local key=counter op=inc value=1',
  't=2 A send→B key=counter value=1',
  't=3 C local key=flag value=on',
  't=4 B recv←A key=counter value=1',
  't=5 B local key=counter op=inc value=2',
  't=5 C local key=counter op=inc value=7',  // concurrent with B
  't=6 C send→D key=counter value=7',
  't=7 D recv←C key=counter value=7',
  't=8 D send→B key=counter value=7',
  't=9 B recv←D key=counter value=7',
  't=10 A local key=flag value=off',         // concurrent vs C@t=3
  't=11 A send→D key=flag value=off',
  't=12 D recv←A key=flag value=off',
].join('\n');

const state = {
  rawLog: SAMPLE,
  events: [],
  replicas: [],
  warnings: [],
  concurrentPairs: [],
  conflicts: {}, // key -> [events]
  finalState: {},
  strategy: 'lww',
  f: 1,
  n: 4,
};

// ---------- Parser ----------
function parse(raw){
  const lines = raw.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const events = [];
  const warnings = [];
  const participants = new Set();
  for (let i=0;i<lines.length;i++){
    const ln = lines[i];
    // Try the shapes we understand
    // t=N ACTOR kind...
    let m = ln.match(/^(?:t=(\d+)\s+)?([A-Za-z0-9_-]+)\s+(local|send→|recv←|send|recv)\s*(?:[→←]\s*)?([A-Za-z0-9_-]+)?\s*(.*)$/);
    if (!m){
      warnings.push({ cls: 'err', msg: 'L' + (i+1) + ': unparsed — ' + ln });
      continue;
    }
    let [, t, actor, kind, partner, rest] = m;
    // normalize kind
    if (kind === 'send→' || kind === 'send') kind = 'send';
    else if (kind === 'recv←' || kind === 'recv') kind = 'recv';
    else kind = 'local';
    // parse key=value tokens
    const attrs = {};
    for (const pair of rest.split(/\s+/).filter(Boolean)){
      const eq = pair.indexOf('=');
      if (eq < 0) continue;
      attrs[pair.slice(0,eq)] = pair.slice(eq+1);
    }
    participants.add(actor);
    if (partner) participants.add(partner);
    // recv with no partner → warn
    if (kind !== 'local' && !partner){
      warnings.push({ cls: 'warn', msg: 'L' + (i+1) +
        ': ' + kind + ' missing partner — treating as local' });
      kind = 'local';
    }
    events.push({
      line: i+1,
      t: t != null ? parseInt(t,10) : null,
      actor, kind, partner: partner || null, attrs, raw: ln,
    });
  }
  // Sort by t where possible; unlabeled events keep source order at end
  events.sort((a,b) => {
    if (a.t != null && b.t != null) return a.t - b.t;
    if (a.t != null) return -1;
    if (b.t != null) return 1;
    return a.line - b.line;
  });
  // Pair send/recv
  for (const e of events){
    if (e.kind === 'send'){
      const matches = events.filter(x => x.kind === 'recv' &&
        x.actor === e.partner && x.partner === e.actor &&
        Object.keys(e.attrs).every(k => x.attrs[k] === undefined || x.attrs[k] === e.attrs[k]));
      if (!matches.length){
        warnings.push({ cls: 'warn', msg: 'L' + e.line +
          ': send without matching recv' });
      }
    }
    if (e.kind === 'recv'){
      const sender = events.find(x => x.kind === 'send' &&
        x.actor === e.partner && x.partner === e.actor && x.line < e.line);
      if (!sender){
        warnings.push({ cls: 'warn', msg: 'L' + e.line +
          ': recv without earlier send — causal chain broken' });
      }
    }
  }
  // Validate numeric `value` for divide-by-zero guard when numeric ops
  for (const e of events){
    if (e.attrs.op === 'rate' && e.attrs.denominator === '0'){
      warnings.push({ cls: 'warn', msg: 'L' + e.line +
        ': denominator=0 — guarded against NaN propagation' });
    }
  }
  state.events = events;
  state.replicas = [...participants].sort();
  state.warnings = warnings;
}

// ---------- Vector clock computation ----------
function computeClocks(){
  const idx = {};
  state.replicas.forEach((r,i) => idx[r] = i);
  const vc = {}; const lam = {};
  for (const r of state.replicas){
    vc[r] = Array(state.replicas.length).fill(0);
    lam[r] = 0;
  }
  const sendVc = {}; // line -> snapshot used by matching recv
  const sendLam = {};
  for (const e of state.events){
    if (e.kind === 'local'){
      lam[e.actor]++;
      vc[e.actor][idx[e.actor]]++;
    } else if (e.kind === 'send'){
      lam[e.actor]++;
      vc[e.actor][idx[e.actor]]++;
      sendVc[e.line] = vc[e.actor].slice();
      sendLam[e.line] = lam[e.actor];
    } else if (e.kind === 'recv'){
      // find the last send from partner to this actor before this line
      const sender = [...state.events].reverse().find(x =>
        x.line < e.line && x.kind === 'send' &&
        x.actor === e.partner && x.partner === e.actor);
      if (sender){
        const sVc = sendVc[sender.line] || Array(state.replicas.length).fill(0);
        for (let i=0;i<vc[e.actor].length;i++){
          vc[e.actor][i] = Math.max(vc[e.actor][i], sVc[i]);
        }
        lam[e.actor] = Math.max(lam[e.actor], sendLam[sender.line] || 0);
      }
      lam[e.actor]++;
      vc[e.actor][idx[e.actor]]++;
    }
    e.lamport = lam[e.actor];
    e.vc = vc[e.actor].slice();
  }
  state.finalState = {};
  for (const r of state.replicas){
    state.finalState[r] = { vc: vc[r].slice(), lamport: lam[r] };
  }
}

function vcCompare(a,b){
  let lt=false, gt=false;
  for (let i=0;i<a.length;i++){
    if (a[i] < b[i]) lt = true;
    if (a[i] > b[i]) gt = true;
  }
  if (lt && !gt) return -1;
  if (gt && !lt) return 1;
  if (!lt && !gt) return 0;
  return 2;
}

// ---------- Concurrency + conflict grouping ----------
function findConcurrent(){
  const pairs = [];
  const writes = state.events.filter(e => e.kind === 'local' || e.kind === 'send');
  for (let i=0;i<writes.length;i++){
    for (let j=i+1;j<writes.length;j++){
      const a = writes[i], b = writes[j];
      if (vcCompare(a.vc, b.vc) === 2){
        // same key?
        if (a.attrs.key && a.attrs.key === b.attrs.key){
          pairs.push({ a, b });
        }
      }
    }
  }
  state.concurrentPairs = pairs;
  // Group by key
  const byKey = {};
  for (const e of writes){
    if (!e.attrs.key) continue;
    (byKey[e.attrs.key] ||= []).push(e);
  }
  state.conflicts = byKey;
}

// ---------- Resolution ----------
function resolveKey(events, strategy){
  if (events.length <= 1) return { value: events[0]?.attrs.value ?? null,
    note: 'single writer' };
  // Find concurrent set = no event happens-before another within set
  const latest = [];
  for (const e of events){
    const dominated = events.some(o => o !== e && vcCompare(o.vc, e.vc) === 1);
    if (!dominated) latest.push(e);
  }
  if (latest.length === 1){
    return { value: latest[0].attrs.value, note: 'causal dominance (' + latest[0].actor + ')' };
  }
  // Concurrent — apply strategy
  if (strategy === 'lww'){
    const sorted = latest.slice().sort((a,b) =>
      b.lamport - a.lamport || (a.actor < b.actor ? 1 : -1));
    return { value: sorted[0].attrs.value,
      note: 'LWW tiebreak: highest lamport, then actor desc' };
  }
  if (strategy === 'orset'){
    return { value: [...new Set(latest.map(e => e.attrs.value))].sort().join(','),
      note: 'OR-set union' };
  }
  if (strategy === 'gcounter'){
    const total = latest.reduce((s,e) => s + (parseFloat(e.attrs.value)||0), 0);
    return { value: String(total), note: 'sum of concurrent values' };
  }
  if (strategy === 'mvreg'){
    return { value: latest.map(e => e.actor + '=' + e.attrs.value).join(' | '),
      note: 'multi-value register — keep all' };
  }
  if (strategy === 'pbft'){
    const need = 2*state.f + 1;
    return { value: latest.length >= need ? latest[0].attrs.value : 'ABORT',
      note: latest.length >= need
        ? 'quorum size ' + latest.length + ' ≥ 2f+1=' + need
        : 'insufficient commits for safety' };
  }
  return { value: null, note: 'unknown strategy' };
}

// ---------- Byzantine risk scoring ----------
function byzantineAnalysis(){
  const replicaStats = {};
  for (const r of state.replicas) replicaStats[r] = { sent: 0, recv: 0, local: 0, anomalies: 0 };
  for (const e of state.events){
    replicaStats[e.actor][e.kind === 'send' ? 'sent' : e.kind === 'recv' ? 'recv' : 'local']++;
  }
  // Heuristic: a replica that only sends and never locals is suspicious
  for (const r of state.replicas){
    const s = replicaStats[r];
    if (s.sent > 0 && s.local === 0) s.anomalies++;
    if (s.recv === 0 && s.sent > 3) s.anomalies++;
  }
  // Safety check
  const need = 2*state.f + 1;
  const ok = state.n >= 3*state.f + 1;
  return { replicaStats, need, ok };
}

// ---------- Export ----------
function toCsv(){
  const rows = [['#','t','actor','kind','partner','key','value','lamport','vc']];
  state.events.forEach((e,i) => rows.push([
    i+1, e.t ?? '', e.actor, e.kind, e.partner ?? '',
    e.attrs.key ?? '', e.attrs.value ?? '', e.lamport,
    '[' + (e.vc||[]).join(' ') + ']'
  ]));
  return rows.map(r => r.map(c =>
    /[,"\n]/.test(String(c)) ? '"' + String(c).replace(/"/g,'""') + '"' : c
  ).join(',')).join('\n');
}
function toJson(){
  return JSON.stringify({
    replicas: state.replicas,
    events: state.events.map(e => ({
      line: e.line, t: e.t, actor: e.actor, kind: e.kind,
      partner: e.partner, attrs: e.attrs,
      lamport: e.lamport, vc: e.vc,
    })),
    finalState: state.finalState,
    concurrentPairs: state.concurrentPairs.map(p => ({
      a: { line: p.a.line, key: p.a.attrs.key, actor: p.a.actor },
      b: { line: p.b.line, key: p.b.attrs.key, actor: p.b.actor },
    })),
  }, null, 2);
}

// ---------- Rendering ----------
function render(){
  // Participants
  document.getElementById('participants').innerHTML =
    state.replicas.length
      ? state.replicas.map((r,i) => `<code>${r}</code> @idx${i}`).join(' · ')
      : '<i>none yet</i>';
  document.getElementById('parseReport').innerHTML = state.events.length
    ? `parsed <b>${state.events.length}</b> events across <b>${state.replicas.length}</b> replicas`
    : 'no events parsed yet';
  document.getElementById('parseWarnings').innerHTML =
    state.warnings.map(w => `<li class="${w.cls}">${w.msg}</li>`).join('') || '<li>no warnings</li>';

  // Clocks table
  const tbody = document.querySelector('#clockTable tbody');
  tbody.innerHTML = state.events.map((e,i) => {
    const concurrent = state.concurrentPairs.some(p =>
      p.a === e || p.b === e);
    return `<tr class="${concurrent?'concurrent':''}">
      <td>${i+1}</td><td>${e.t ?? '—'}</td>
      <td><code>${e.actor}</code></td>
      <td>${e.kind}</td>
      <td>${e.partner ?? ''}</td>
      <td>${e.lamport ?? ''}</td>
      <td>[${(e.vc||[]).join(',')}] ${e.attrs.key?('· '+e.attrs.key+'='+e.attrs.value):''}</td>
    </tr>`;
  }).join('');

  // Final state
  document.getElementById('finalState').innerHTML = state.replicas.length
    ? state.replicas.map(r => {
        const s = state.finalState[r] || {};
        return `<b>${r}</b> L=${s.lamport||0} vc=[${(s.vc||[]).join(',')}]`;
      }).join('<br>')
    : 'parse a log first';

  renderHbGraph();

  // Conflicts
  const pairs = state.concurrentPairs;
  document.getElementById('concurrentPairs').innerHTML = pairs.length
    ? pairs.map(p => `
      <div style="margin-bottom:8px">
        <b>key="${p.a.attrs.key}"</b> · concurrent<br>
        ${p.a.actor} vc=[${p.a.vc.join(',')}] L=${p.a.lamport} value=${p.a.attrs.value}<br>
        ${p.b.actor} vc=[${p.b.vc.join(',')}] L=${p.b.lamport} value=${p.b.attrs.value}
      </div>`).join('')
    : 'no concurrent writes detected';

  // Byzantine analysis
  const ba = byzantineAnalysis();
  document.getElementById('byzantineScore').innerHTML =
    `N=${state.n} · f=${state.f} · need 2f+1=${ba.need}<br>` +
    `safety: <b style="color:${ba.ok?'var(--accent)':'var(--danger)'}">${ba.ok?'HOLDS (N≥3f+1)':'VIOLATED'}</b><br><br>` +
    state.replicas.map(r => {
      const s = ba.replicaStats[r];
      return `<code>${r}</code> send=${s.sent} recv=${s.recv} local=${s.local}` +
        (s.anomalies ? ` <b style="color:var(--warn)">anom=${s.anomalies}</b>` : '');
    }).join('<br>');
  document.getElementById('gates').innerHTML = [
    state.n >= 3*state.f + 1
      ? `<li class="ok">admission gate — N≥3f+1 (${state.n}≥${3*state.f+1})</li>`
      : `<li class="err">admission gate — need ≥${3*state.f+1} replicas, have ${state.n}</li>`,
    pairs.length === 0
      ? `<li class="ok">in-flight monitor — no concurrent writes on same key</li>`
      : `<li class="warn">in-flight monitor — ${pairs.length} concurrent pairs flagged</li>`,
    state.warnings.filter(w => w.cls==='err').length === 0
      ? `<li class="ok">circuit breaker — parser healthy</li>`
      : `<li class="err">circuit breaker — ${state.warnings.filter(w=>w.cls==='err').length} unparsed lines</li>`,
  ].join('');

  // Resolution table
  const keys = Object.keys(state.conflicts);
  document.getElementById('resolutionTable').innerHTML =
    `<div class="row header"><div>key</div><div>writers</div><div>resolved value</div><div>note</div></div>` +
    (keys.length ? keys.map(k => {
      const r = resolveKey(state.conflicts[k], state.strategy);
      const writers = state.conflicts[k].map(e => e.actor + '=' + e.attrs.value).join(' · ');
      const concurrent = state.conflicts[k].length > 1 &&
        state.conflicts[k].some((x,i) =>
          state.conflicts[k].slice(i+1).some(y => vcCompare(x.vc, y.vc) === 2));
      return `<div class="row ${concurrent?'concurrent':''}">
        <div><code>${k}</code></div>
        <div>${writers}</div>
        <div><b>${r.value}</b></div>
        <div style="color:var(--muted)">${r.note}</div>
      </div>`;
    }).join('') : `<div class="row"><div colspan="4" style="color:var(--muted)">no keyed writes</div></div>`);

  document.getElementById('quorumSanity').innerHTML =
    `strategy: <b>${state.strategy}</b><br>` +
    `requires quorum: ${state.strategy==='pbft'?'yes (2f+1='+(2*state.f+1)+')':'no'}<br>` +
    `concurrent-key conflicts: ${pairs.length}`;

  // Export
  document.getElementById('exportCsv').value = toCsv();
  document.getElementById('exportJson').value = toJson();

  // Footer
  document.getElementById('eventCount').textContent = state.events.length + ' events';
  document.getElementById('replicaCount').textContent = state.replicas.length + ' replicas';
  document.getElementById('concurrentCount').textContent = pairs.length + ' concurrent';
}

function renderHbGraph(){
  const cv = document.getElementById('hbCanvas');
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#242837'; ctx.fillRect(0,0,cv.width,cv.height);
  const rs = state.replicas;
  if (!rs.length) return;
  const laneH = cv.height / rs.length;
  // lanes
  for (let i=0;i<rs.length;i++){
    ctx.fillStyle = '#6ee7b7';
    ctx.font = 'bold 11px ui-monospace';
    ctx.textAlign = 'left'; ctx.textBaseline='middle';
    ctx.fillText(rs[i], 6, i*laneH + laneH/2);
    ctx.strokeStyle = '#2c3040';
    ctx.beginPath(); ctx.moveTo(40, i*laneH + laneH/2);
    ctx.lineTo(cv.width - 10, i*laneH + laneH/2); ctx.stroke();
  }
  if (!state.events.length) return;
  const minT = state.events[0].lamport;
  const maxT = state.events[state.events.length-1].lamport;
  const span = Math.max(1, maxT - minT);
  const xOf = (l) => 50 + ((l - minT) / span) * (cv.width - 70);
  const yOf = (a) => rs.indexOf(a) * laneH + laneH/2;
  // edges
  for (const e of state.events){
    if (e.kind === 'recv'){
      const sender = [...state.events].reverse().find(x =>
        x.line < e.line && x.kind === 'send' &&
        x.actor === e.partner && x.partner === e.actor);
      if (!sender) continue;
      ctx.strokeStyle = '#6ee7b7';
      ctx.beginPath(); ctx.moveTo(xOf(sender.lamport), yOf(sender.actor));
      ctx.lineTo(xOf(e.lamport), yOf(e.actor)); ctx.stroke();
    }
  }
  // nodes
  for (const e of state.events){
    ctx.fillStyle = e.kind==='local'?'#8bfaff':e.kind==='send'?'#6ee7b7':'#f4c17a';
    ctx.beginPath(); ctx.arc(xOf(e.lamport), yOf(e.actor), 4, 0, Math.PI*2); ctx.fill();
  }
}

// ---------- Event wiring ----------
document.querySelectorAll('.tab').forEach(t => {
  t.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    document.getElementById(t.dataset.tab).classList.add('active');
    render();
  });
});
document.getElementById('sampleBtn').onclick = () => {
  document.getElementById('logInput').value = SAMPLE;
  doParse();
};
document.getElementById('parseBtn').onclick = doParse;
document.getElementById('clearBtn').onclick = () => {
  document.getElementById('logInput').value = '';
  state.events = []; state.replicas = []; state.warnings = [];
  state.concurrentPairs = []; state.conflicts = {}; render();
};
document.getElementById('defaultStrategy').onchange = e => {
  state.strategy = e.target.value; render();
};
document.getElementById('fInput').onchange = e => {
  state.f = Math.max(0, parseInt(e.target.value,10) || 0); render();
};
document.getElementById('nInput').onchange = e => {
  state.n = Math.max(1, parseInt(e.target.value,10) || 1); render();
};
document.getElementById('recomputeBtn').onclick = render;
document.getElementById('copyCsvBtn').onclick = () => {
  navigator.clipboard.writeText(document.getElementById('exportCsv').value);
};
document.getElementById('copyJsonBtn').onclick = () => {
  navigator.clipboard.writeText(document.getElementById('exportJson').value);
};
window.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter'){ e.preventDefault(); doParse(); }
});

function doParse(){
  state.rawLog = document.getElementById('logInput').value;
  parse(state.rawLog);
  if (state.events.length){
    computeClocks();
    findConcurrent();
  } else {
    state.concurrentPairs = []; state.conflicts = {};
  }
  state.n = Math.max(state.n, state.replicas.length);
  document.getElementById('nInput').value = state.n;
  render();
}

// init
document.getElementById('logInput').value = SAMPLE;
doParse();