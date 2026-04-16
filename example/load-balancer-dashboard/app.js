const nodes = [
  { id: 'us-east-1a', cpu: 42, rps: 1240, lat: 12, status: 'healthy' },
  { id: 'us-east-1b', cpu: 67, rps: 980, lat: 18, status: 'healthy' },
  { id: 'us-west-2a', cpu: 85, rps: 1520, lat: 34, status: 'warn' },
  { id: 'eu-west-1a', cpu: 23, rps: 640, lat: 8, status: 'healthy' },
  { id: 'ap-south-1a', cpu: 91, rps: 1780, lat: 45, status: 'crit' },
  { id: 'eu-central-1', cpu: 55, rps: 1100, lat: 15, status: 'healthy' }
];
const history = Array.from({ length: 60 }, () => Math.random() * 2000 + 800);
const grid = document.getElementById('grid');
const chart = document.getElementById('chart');
const cCtx = chart.getContext('2d');

function renderCards() {
  grid.innerHTML = '';
  nodes.forEach(n => {
    n.cpu = Math.max(5, Math.min(99, n.cpu + (Math.random() - 0.48) * 6 | 0));
    n.rps = Math.max(100, n.rps + (Math.random() - 0.5) * 200 | 0);
    n.lat = Math.max(2, n.lat + (Math.random() - 0.5) * 4 | 0);
    n.status = n.cpu > 88 ? 'crit' : n.cpu > 70 ? 'warn' : 'healthy';
    const cls = n.status;
    grid.innerHTML += `<div class="card"><h3>${n.id}</h3>
      <div class="val ${cls}">${n.cpu}% <span style="font-size:0.7rem">CPU</span></div>
      <div class="bar"><div class="bar-fill" style="width:${n.cpu}%;background:${cls==='crit'?'#f87171':cls==='warn'?'#fbbf24':'#6ee7b7'}"></div></div>
      <div style="margin-top:8px;font-size:0.8rem;color:#888">${n.rps} rps · ${n.lat}ms</div></div>`;
  });
}

function drawChart() {
  history.push(nodes.reduce((s, n) => s + n.rps, 0));
  if (history.length > 60) history.shift();
  chart.width = chart.parentElement.clientWidth - 32;
  chart.height = 180;
  const w = chart.width, h = chart.height;
  const max = Math.max(...history) * 1.1;
  cCtx.clearRect(0, 0, w, h);
  cCtx.beginPath();
  history.forEach((v, i) => {
    const x = (i / 59) * w, y = h - (v / max) * h;
    i === 0 ? cCtx.moveTo(x, y) : cCtx.lineTo(x, y);
  });
  cCtx.strokeStyle = '#6ee7b7'; cCtx.lineWidth = 2; cCtx.stroke();
  cCtx.lineTo(w, h); cCtx.lineTo(0, h); cCtx.closePath();
  cCtx.fillStyle = '#6ee7b711'; cCtx.fill();
  cCtx.fillStyle = '#888'; cCtx.font = '11px monospace';
  cCtx.fillText('Total RPS (60s)', 4, 14);
  cCtx.fillText(history[history.length - 1].toFixed(0), w - 50, 14);
}

function tick() {
  document.getElementById('clock').textContent = new Date().toLocaleTimeString();
  renderCards(); drawChart();
}
tick(); setInterval(tick, 1000);