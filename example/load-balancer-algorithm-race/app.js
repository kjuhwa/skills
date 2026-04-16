const algos = [
  { name: 'Round Robin', fn: (servers, i) => servers[i % servers.length] },
  { name: 'Least Loaded', fn: (servers) => servers.reduce((a, b) => a.load < b.load ? a : b) },
  { name: 'Weighted Random', fn: (servers) => { const weights = servers.map(s => s.capacity - s.load); const total = weights.reduce((a, b) => a + Math.max(a, b + 1), 1); let r = Math.random() * total; for (const s of servers) { r -= (s.capacity - s.load); if (r <= 0) return s; } return servers[0]; } }
];
const TOTAL = 200, SERVERS = 5;
const colors = ['#6ee7b7','#60a5fa','#fbbf24','#a78bfa','#fb923c'];
let running = false;

function buildLanes() {
  const el = document.getElementById('lanes'); el.innerHTML = '';
  return algos.map((a, ai) => {
    const lane = document.createElement('div'); lane.className = 'lane';
    const srvs = Array.from({ length: SERVERS }, (_, i) => ({ load: 0, capacity: 30 + Math.floor(Math.random() * 20), id: i }));
    let html = `<h2>${a.name}</h2>`;
    srvs.forEach((s, i) => { html += `<div class="bar-wrap"><span class="bar-label">S${i + 1}</span><div class="bar-bg"><div class="bar-fill" id="bf-${ai}-${i}" style="width:0%;background:${colors[i]}"></div></div><span class="bar-val" id="bv-${ai}-${i}">0</span></div>`; });
    html += `<div class="stats" id="st-${ai}">Waiting...</div>`;
    lane.innerHTML = html; el.appendChild(lane);
    return { algo: a, servers: srvs };
  });
}

async function race() {
  if (running) return; running = true;
  document.getElementById('result').textContent = '';
  const lanes = buildLanes();
  for (let i = 0; i < TOTAL; i++) {
    lanes.forEach((l, ai) => {
      const srv = l.algo.fn(l.servers, i);
      srv.load++;
      l.servers.forEach((s, si) => {
        const pct = (s.load / TOTAL) * 100;
        document.getElementById(`bf-${ai}-${si}`).style.width = Math.min(pct * 3, 100) + '%';
        document.getElementById(`bv-${ai}-${si}`).textContent = s.load;
      });
      const maxLoad = Math.max(...l.servers.map(s => s.load));
      const stdDev = Math.sqrt(l.servers.reduce((sum, s) => sum + (s.load - TOTAL / SERVERS) ** 2, 0) / SERVERS).toFixed(1);
      document.getElementById(`st-${ai}`).textContent = `Req: ${i + 1}/${TOTAL} · Max: ${maxLoad} · StdDev: ${stdDev}`;
    });
    if (i % 5 === 0) await new Promise(r => setTimeout(r, 16));
  }
  const scores = lanes.map(l => ({ name: l.algo.name, max: Math.max(...l.servers.map(s => s.load)), std: Math.sqrt(l.servers.reduce((sum, s) => sum + (s.load - TOTAL / SERVERS) ** 2, 0) / SERVERS) }));
  scores.sort((a, b) => a.std - b.std);
  document.getElementById('result').textContent = `Winner: ${scores[0].name} (StdDev: ${scores[0].std.toFixed(1)})`;
  running = false;
}

document.getElementById('race').onclick = race;
buildLanes();