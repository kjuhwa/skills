const SERVICES = [
  'auth-service', 'user-api', 'payment-gw', 'order-service',
  'inventory', 'shipping', 'notifications', 'analytics',
  'recommendation', 'search-api', 'cdn-edge', 'ml-ranker',
];

const services = SERVICES.map(name => ({
  name,
  status: 'CLOSED',
  failures: 0,
  calls: 0,
  errors: 0,
  latency: 40 + Math.random() * 60,
  threshold: 5,
  chaos: false,
  openUntil: 0,
}));

let paused = false;
let tps = 0;
const errorHistory = new Array(60).fill(0);
const grid = document.getElementById('grid');
const chart = document.getElementById('chart');
const cctx = chart.getContext('2d');

function render() {
  grid.innerHTML = '';
  services.forEach((s, i) => {
    const card = document.createElement('div');
    const cls = s.status === 'OPEN' ? 'open' : s.status === 'HALF-OPEN' ? 'half' : 'closed';
    card.className = `card ${cls}` + (s.chaos ? ' chaos' : '');
    const rate = s.calls ? ((s.errors / s.calls) * 100).toFixed(1) : '0.0';
    const pct = Math.min((s.failures / s.threshold) * 100, 100);
    const bcol = s.status === 'OPEN' ? '#ef4444' : s.status === 'HALF-OPEN' ? '#facc15' : '#6ee7b7';
    card.innerHTML = `
      <h3>${s.name}</h3>
      <div class="status">${s.status}</div>
      <div class="row"><span>Calls</span><b>${s.calls}</b></div>
      <div class="row"><span>Error rate</span><b>${rate}%</b></div>
      <div class="row"><span>Latency</span><b>${Math.round(s.latency)}ms</b></div>
      <div class="bar"><div style="width:${pct}%;background:${bcol}"></div></div>
    `;
    card.onclick = () => { s.chaos = !s.chaos; render(); };
    grid.appendChild(card);
  });
}

function tick() {
  if (paused) return;
  let secondCalls = 0;
  services.forEach(s => {
    const calls = 2 + Math.floor(Math.random() * 5);
    secondCalls += calls;
    for (let i = 0; i < calls; i++) {
      if (s.status === 'OPEN') {
        if (Date.now() > s.openUntil) s.status = 'HALF-OPEN';
        else { s.calls++; s.errors++; continue; }
      }
      s.calls++;
      const failProb = s.chaos ? 0.75 : 0.05;
      if (Math.random() < failProb) {
        s.errors++; s.failures++;
        s.latency = Math.min(s.latency + 10, 400);
        if (s.status === 'HALF-OPEN' || s.failures >= s.threshold) {
          s.status = 'OPEN'; s.openUntil = Date.now() + 6000;
        }
      } else {
        s.failures = Math.max(0, s.failures - 1);
        s.latency = Math.max(30, s.latency - 2);
        if (s.status === 'HALF-OPEN') { s.status = 'CLOSED'; s.failures = 0; }
      }
    }
  });
  tps = secondCalls;
  document.getElementById('tps').textContent = tps;
  const totalCalls = services.reduce((a, s) => a + s.calls, 0);
  const totalErr = services.reduce((a, s) => a + s.errors, 0);
  errorHistory.shift();
  errorHistory.push(totalCalls ? totalErr / totalCalls : 0);
  drawChart();
  render();
}

function drawChart() {
  const w = chart.width, h = chart.height;
  cctx.clearRect(0, 0, w, h);
  cctx.strokeStyle = '#272b38';
  cctx.beginPath();
  for (let i = 0; i <= 4; i++) {
    const y = (i / 4) * h;
    cctx.moveTo(0, y); cctx.lineTo(w, y);
  }
  cctx.stroke();
  cctx.strokeStyle = '#6ee7b7';
  cctx.lineWidth = 2;
  cctx.beginPath();
  errorHistory.forEach((v, i) => {
    const x = (i / 59) * w;
    const y = h - v * h;
    i === 0 ? cctx.moveTo(x, y) : cctx.lineTo(x, y);
  });
  cctx.stroke();
  cctx.fillStyle = 'rgba(110,231,183,0.1)';
  cctx.lineTo(w, h); cctx.lineTo(0, h); cctx.closePath(); cctx.fill();
}

document.getElementById('pauseBtn').onclick = (e) => {
  paused = !paused;
  e.target.textContent = paused ? 'Resume traffic' : 'Pause traffic';
};
document.getElementById('chaosAll').onclick = () => { services.forEach(s => s.chaos = true); render(); };
document.getElementById('healAll').onclick = () => {
  services.forEach(s => { s.chaos = false; s.failures = 0; s.status = 'CLOSED'; });
  render();
};

render();
setInterval(tick, 1000);