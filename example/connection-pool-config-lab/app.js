const PALETTE = ['#6ee7b7', '#f472b6', '#60a5fa', '#fbbf24', '#a78bfa', '#f87171'];
const runs = [];
let activeRun = null;

const $ = id => document.getElementById(id);
['minIdle', 'maxPoolSize', 'connectionTimeout', 'idleTimeout'].forEach(id => {
  const s = $(id), o = $('o' + id[0].toUpperCase() + id.slice(1));
  s.oninput = () => o.textContent = s.value;
});

function genTraffic(profile, seconds) {
  const events = [];
  for (let t = 0; t < seconds * 1000; t += 20) {
    let rate;
    switch (profile) {
      case 'steady': rate = 50; break;
      case 'spiky': rate = t % 10000 < 1500 ? 200 : 15; break;
      case 'ramp': rate = 10 + (t / (seconds * 1000)) * 120; break;
      case 'chaos': rate = 20 + Math.random() * 180; break;
    }
    const n = (rate * 20) / 1000;
    const count = Math.floor(n) + (Math.random() < (n % 1) ? 1 : 0);
    for (let i = 0; i < count; i++) events.push({ t: t + Math.random() * 20, dur: 50 + Math.random() * 400 });
  }
  return events.sort((a, b) => a.t - b.t);
}

function simulate(config, events) {
  const { minIdle, maxPoolSize, connectionTimeout } = config;
  const pool = Array.from({ length: minIdle }, () => ({ busy: false, finish: 0 }));
  const samples = [];
  let served = 0, timedOut = 0, totalLatency = 0;
  const bucket = new Array(60).fill(0);
  const bucketLat = new Array(60).fill(0);
  const bucketCount = new Array(60).fill(0);

  for (const ev of events) {
    for (const c of pool) if (c.busy && c.finish <= ev.t) c.busy = false;
    let conn = pool.find(c => !c.busy);
    if (!conn && pool.length < maxPoolSize) {
      conn = { busy: false, finish: 0 };
      pool.push(conn);
    }
    if (!conn) {
      let waitFor = Math.min(...pool.map(c => c.finish)) - ev.t;
      if (waitFor > connectionTimeout) { timedOut++; continue; }
      const latency = waitFor + ev.dur;
      totalLatency += latency;
      served++;
      const freed = pool.find(c => c.finish === ev.t + waitFor);
      freed.finish = ev.t + waitFor + ev.dur;
      freed.busy = true;
      const b = Math.floor(ev.t / 1000);
      bucketLat[b] += latency; bucketCount[b]++;
    } else {
      conn.busy = true;
      conn.finish = ev.t + ev.dur;
      totalLatency += ev.dur;
      served++;
      const b = Math.floor(ev.t / 1000);
      bucketLat[b] += ev.dur; bucketCount[b]++;
    }
  }
  for (let i = 0; i < 60; i++) samples.push(bucketCount[i] ? bucketLat[i] / bucketCount[i] : 0);
  return {
    avgLatency: served ? totalLatency / served : 0,
    served, timedOut,
    peakPool: pool.length,
    samples
  };
}

function drawChart() {
  const svg = $('chart');
  svg.innerHTML = '';
  const W = 600, H = 280, P = 30;
  const maxY = Math.max(100, ...runs.flatMap(r => r.result.samples));
  for (let i = 0; i <= 4; i++) {
    const y = P + (H - 2 * P) * i / 4;
    svg.insertAdjacentHTML('beforeend', `<line x1="${P}" y1="${y}" x2="${W - P}" y2="${y}" stroke="#262a36" stroke-width="1"/>`);
    svg.insertAdjacentHTML('beforeend', `<text x="4" y="${y + 4}" fill="#6b7280" font-size="10">${Math.round(maxY * (1 - i / 4))}</text>`);
  }
  runs.forEach((run, idx) => {
    const pts = run.result.samples.map((v, i) => {
      const x = P + (W - 2 * P) * (i / 59);
      const y = H - P - (H - 2 * P) * (v / maxY);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    const isActive = run === activeRun;
    svg.insertAdjacentHTML('beforeend', `<polyline points="${pts}" fill="none" stroke="${run.color}" stroke-width="${isActive ? 2.5 : 1.5}" opacity="${isActive || !activeRun ? 1 : 0.4}"/>`);
  });
  svg.insertAdjacentHTML('beforeend', `<text x="${W/2}" y="${H-6}" fill="#6b7280" font-size="10" text-anchor="middle">seconds →</text>`);
}

function renderRuns() {
  const el = $('runs');
  if (!runs.length) { el.innerHTML = '<div class="empty">No runs yet. Click Run Simulation.</div>'; return; }
  el.innerHTML = runs.map((r, i) => `
    <div class="run ${r === activeRun ? 'active' : ''}" data-i="${i}">
      <div class="dot" style="background:${r.color}"></div>
      <div class="meta">
        <strong>${r.config.profile}</strong> · min ${r.config.minIdle}, max ${r.config.maxPoolSize}, timeout ${r.config.connectionTimeout}ms
      </div>
      <div class="metrics">
        <div>avg <span>${Math.round(r.result.avgLatency)}ms</span></div>
        <div>served <span>${r.result.served}</span></div>
        <div>timeouts <span>${r.result.timedOut}</span></div>
      </div>
    </div>
  `).join('');
  el.querySelectorAll('.run').forEach(div => {
    div.onclick = () => { activeRun = runs[+div.dataset.i] === activeRun ? null : runs[+div.dataset.i]; render(); };
  });
}

function render() { drawChart(); renderRuns(); }

$('run').onclick = () => {
  const config = {
    minIdle: +$('minIdle').value,
    maxPoolSize: +$('maxPoolSize').value,
    connectionTimeout: +$('connectionTimeout').value,
    idleTimeout: +$('idleTimeout').value,
    profile: $('profile').value
  };
  const events = genTraffic(config.profile, 60);
  const result = simulate(config, events);
  runs.unshift({ config, result, color: PALETTE[runs.length % PALETTE.length] });
  if (runs.length > 6) runs.pop();
  activeRun = runs[0];
  render();
};

$('clear').onclick = () => { runs.length = 0; activeRun = null; render(); };

$('run').click();