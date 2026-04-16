const ALGOS = [
  { id: 'rr', name: 'Round Robin', desc: 'Cycles through every server in order.' },
  { id: 'lc', name: 'Least Connections', desc: 'Routes to the server with fewest active connections.' },
  { id: 'rand', name: 'Random', desc: 'Pure random pick — baseline chaos.' },
  { id: 'iphash', name: 'IP Hash', desc: 'Sticky: same client IP always maps to same server.' }
];

const SERVERS = ['A','B','C','D','D','E'];
const grid = document.getElementById('grid');
const patternEl = document.getElementById('pattern');
const tickEl = document.getElementById('tick');

const state = ALGOS.map(a => ({
  ...a,
  counts: SERVERS.map(() => 0),
  active: SERVERS.map(() => 0),
  total: 0,
  rrIdx: 0
}));

function initUI() {
  grid.innerHTML = '';
  state.forEach(s => {
    const panel = document.createElement('div');
    panel.className = 'panel';
    panel.innerHTML = `
      <h3>${s.name}</h3>
      <div class="desc">${s.desc}</div>
      <div class="chart" id="chart-${s.id}">
        ${SERVERS.map((n,i) => `<div class="bar-col" data-name="${n}${i}"><span>0</span></div>`).join('')}
      </div>
      <div class="metrics">
        <span>Total: <strong id="total-${s.id}">0</strong></span>
        <span>Std dev: <strong id="std-${s.id}">0</strong></span>
        <span>Max load: <strong id="max-${s.id}">0</strong></span>
      </div>`;
    grid.appendChild(panel);
  });
}

function hash(str) { let h = 0; for (const c of str) h = (h*31 + c.charCodeAt(0)) & 0xffff; return h; }

function route(algo, req) {
  const n = SERVERS.length;
  if (algo.id === 'rr') { algo.rrIdx = (algo.rrIdx + 1) % n; return algo.rrIdx; }
  if (algo.id === 'lc') {
    let best = 0;
    for (let i = 1; i < n; i++) if (algo.active[i] < algo.active[best]) best = i;
    return best;
  }
  if (algo.id === 'rand') return Math.floor(Math.random() * n);
  if (algo.id === 'iphash') return hash(req.ip) % n;
}

function genRequest() {
  const p = patternEl.value;
  if (p === 'hotspot' && Math.random() < 0.6) return { ip: '10.0.0.42', cost: 1 + Math.random()*3 };
  return { ip: `10.${Math.floor(Math.random()*256)}.${Math.floor(Math.random()*256)}.${Math.floor(Math.random()*256)}`, cost: 1 + Math.random()*3 };
}

function stddev(arr) {
  const m = arr.reduce((a,b)=>a+b,0) / arr.length;
  return Math.sqrt(arr.reduce((a,b)=>a+(b-m)**2,0) / arr.length).toFixed(1);
}

function render() {
  state.forEach(s => {
    const max = Math.max(1, ...s.counts);
    const cols = document.querySelectorAll(`#chart-${s.id} .bar-col`);
    cols.forEach((c,i) => {
      c.style.height = (s.counts[i]/max*100) + '%';
      c.querySelector('span').textContent = s.counts[i];
      c.classList.toggle('hot', s.counts[i] === max && max > 5);
    });
    document.getElementById(`total-${s.id}`).textContent = s.total;
    document.getElementById(`std-${s.id}`).textContent = stddev(s.counts);
    document.getElementById(`max-${s.id}`).textContent = Math.max(...s.counts);
  });
}

let tick = 0;
function loop() {
  tick++;
  const pattern = patternEl.value;
  const reqs = pattern === 'bursty' ? (tick % 10 === 0 ? 25 : 1) : 4;
  for (let i = 0; i < reqs; i++) {
    const req = genRequest();
    state.forEach(s => {
      const idx = route(s, req);
      s.counts[idx]++;
      s.active[idx]++;
      s.total++;
      setTimeout(() => s.active[idx]--, 500 + Math.random()*1500);
    });
  }
  tickEl.textContent = `tick: ${tick}`;
  render();
}

document.getElementById('reset').onclick = () => {
  state.forEach(s => { s.counts = SERVERS.map(()=>0); s.active = SERVERS.map(()=>0); s.total = 0; s.rrIdx = 0; });
  tick = 0; render();
};

initUI();
render();
setInterval(loop, 300);