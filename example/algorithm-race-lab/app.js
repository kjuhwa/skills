const ALGOS = [
  { id: 'rr', name: 'Round Robin' },
  { id: 'rand', name: 'Random' },
  { id: 'lc', name: 'Least Connections' },
  { id: 'wrr', name: 'Weighted Round Robin' },
  { id: 'p2c', name: 'Power of Two Choices' },
];
const selected = new Set(ALGOS.map(a => a.id));

const algosEl = document.getElementById('algos');
algosEl.innerHTML = ALGOS.map(a =>
  `<label class="on" data-id="${a.id}"><input type="checkbox" checked>${a.name}</label>`).join('');
algosEl.onclick = e => {
  const lab = e.target.closest('label'); if (!lab) return;
  const cb = lab.querySelector('input');
  if (e.target !== cb) cb.checked = !cb.checked;
  lab.classList.toggle('on', cb.checked);
  cb.checked ? selected.add(lab.dataset.id) : selected.delete(lab.dataset.id);
};

function buildServers(n, variance) {
  return Array.from({ length: n }, (_, i) => {
    let w = 1, cap = 10;
    if (variance === 'mid') { w = 1 + (i % 3); cap = 8 + (i % 3) * 3; }
    if (variance === 'high') { w = 1 + Math.floor(Math.random() * 5); cap = 5 + Math.floor(Math.random() * 15); }
    return { id: i, w, cap, conns: 0, total: 0, hist: [] };
  });
}

function chooser(algo, servers) {
  let rrI = 0;
  const wExpanded = [];
  servers.forEach(s => { for (let i = 0; i < s.w; i++) wExpanded.push(s); });
  return () => {
    if (algo === 'rr') return servers[rrI++ % servers.length];
    if (algo === 'rand') return servers[Math.floor(Math.random() * servers.length)];
    if (algo === 'lc') return [...servers].sort((a, b) => a.conns - b.conns)[0];
    if (algo === 'wrr') return wExpanded[rrI++ % wExpanded.length];
    if (algo === 'p2c') {
      const a = servers[Math.floor(Math.random() * servers.length)];
      const b = servers[Math.floor(Math.random() * servers.length)];
      return a.conns <= b.conns ? a : b;
    }
  };
}

function simulate(algo, reqs, servers) {
  const pick = chooser(algo, servers);
  let dropped = 0, latencySum = 0;
  for (let i = 0; i < reqs; i++) {
    const s = pick();
    if (s.conns >= s.cap) { dropped++; continue; }
    s.conns++; s.total++;
    latencySum += 10 + (s.conns / s.cap) * 90;
    if (i % 3 === 0) s.hist.push(s.conns);
    if (Math.random() > 0.35) {
      const r = servers[Math.floor(Math.random() * servers.length)];
      if (r.conns > 0) r.conns--;
    }
  }
  const loads = servers.map(s => s.total);
  const mean = loads.reduce((a, b) => a + b, 0) / loads.length;
  const variance = loads.reduce((a, b) => a + (b - mean) ** 2, 0) / loads.length;
  return { algo, servers, dropped, latency: latencySum / reqs, stdev: Math.sqrt(variance) };
}

function render(results) {
  const grid = document.getElementById('grid');
  const winner = results.reduce((a, b) => a.stdev < b.stdev ? a : b);
  grid.innerHTML = results.map(r => {
    const max = Math.max(...r.servers.map(s => s.total), 1);
    const bw = 100 / r.servers.length;
    const bars = r.servers.map((s, i) =>
      `<rect x="${i * bw + 1}%" y="${120 - (s.total / max) * 110}" width="${bw - 2}%" height="${(s.total / max) * 110}" fill="#6ee7b7" rx="2"/>
       <text x="${i * bw + bw / 2}%" y="118" fill="#9ca3af" font-size="9" text-anchor="middle">${s.total}</text>`
    ).join('');
    const name = ALGOS.find(a => a.id === r.algo).name;
    const cls = r.algo === winner.algo ? 'panel best' : 'panel';
    return `<div class="${cls}">
      <h2>${name}</h2>
      <div class="meta">Distribution across servers</div>
      <svg viewBox="0 0 100 130" preserveAspectRatio="none">${bars}</svg>
      <div class="kpis">
        <span>Stdev: <b>${r.stdev.toFixed(2)}</b></span>
        <span>Avg latency: <b>${r.latency.toFixed(1)}ms</b></span>
        <span>Dropped: <b>${r.dropped}</b></span>
      </div>
    </div>`;
  }).join('');
  document.getElementById('winner').textContent =
    `Best balance: ${ALGOS.find(a => a.id === winner.algo).name} (stdev ${winner.stdev.toFixed(2)})`;
}

function run() {
  const reqs = +document.getElementById('reqs').value;
  const srvs = +document.getElementById('srvs').value;
  const variance = document.getElementById('variance').value;
  const results = [...selected].map(a => simulate(a, reqs, buildServers(srvs, variance)));
  if (results.length) render(results);
}
document.getElementById('run').onclick = run;
run();