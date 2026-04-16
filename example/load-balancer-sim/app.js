const ALGOS = ['Round Robin', 'Least Load', 'Weighted Random'];
const SRV_COUNT = 5;
const weights = [3, 2, 2, 1, 1];
const state = ALGOS.map(() => Array.from({ length: SRV_COUNT }, () => ({ load: 0, total: 0 })));
let rrIdx = [0, 0, 0];
let tick = 0;

function roundRobin(lane) {
  const i = rrIdx[lane] % SRV_COUNT;
  rrIdx[lane]++;
  return i;
}
function leastLoad(lane) {
  let min = Infinity, pick = 0;
  state[lane].forEach((s, i) => { if (s.load < min) { min = s.load; pick = i; } });
  return pick;
}
function weightedRandom() {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < weights.length; i++) { r -= weights[i]; if (r <= 0) return i; }
  return 0;
}
const pickers = [() => roundRobin(0), () => leastLoad(1), weightedRandom];

function render() {
  const lanes = document.getElementById('lanes');
  lanes.innerHTML = '';
  ALGOS.forEach((name, a) => {
    let html = `<div class="lane"><h2>${name}</h2>`;
    const max = Math.max(...state[a].map(s => s.load), 1);
    state[a].forEach((s, i) => {
      const pct = (s.load / 20 * 100).toFixed(0);
      const col = s.load > 15 ? '#f87171' : s.load > 10 ? '#fbbf24' : '#6ee7b7';
      html += `<div class="srv-row"><span class="name">S${i + 1}</span>
        <div class="track"><div class="fill" style="width:${pct}%;background:${col}"></div>
        <span class="lbl">${s.total}</span></div></div>`;
    });
    html += '</div>';
    lanes.innerHTML += html;
  });
  // stats
  const statsEl = document.getElementById('stats');
  statsEl.innerHTML = ALGOS.map((name, a) => {
    const loads = state[a].map(s => s.load);
    const std = Math.sqrt(loads.reduce((s, v) => s + (v - loads.reduce((a, b) => a + b, 0) / loads.length) ** 2, 0) / loads.length);
    return `<div class="stat-card"><h3>${name}</h3><div class="v">σ ${std.toFixed(2)}</div></div>`;
  }).join('');
}

function step() {
  // add requests
  const batch = 1 + (Math.random() * 3 | 0);
  for (let b = 0; b < batch; b++) {
    ALGOS.forEach((_, a) => {
      const i = pickers[a]();
      state[a][i].load++;
      state[a][i].total++;
    });
  }
  // drain some load
  state.forEach(lane => lane.forEach(s => { if (s.load > 0 && Math.random() > 0.4) s.load--; }));
  render();
  tick++;
}
setInterval(step, 400);
render();