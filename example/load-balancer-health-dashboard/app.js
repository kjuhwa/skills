const nodes = [
  { name: 'us-east-1a', rps: 2400, latency: 12, health: 100, uptime: 99.98 },
  { name: 'us-east-1b', rps: 1800, latency: 18, health: 97, uptime: 99.91 },
  { name: 'us-west-2a', rps: 3100, latency: 9, health: 100, uptime: 99.99 },
  { name: 'eu-west-1a', rps: 950, latency: 45, health: 78, uptime: 98.2 },
  { name: 'ap-south-1a', rps: 1200, latency: 32, health: 91, uptime: 99.5 },
  { name: 'eu-central-1a', rps: 2050, latency: 14, health: 100, uptime: 99.97 }
];
const history = nodes.map(() => Array(60).fill(0).map(() => Math.random() * 3000));
const grid = document.getElementById('grid');
const chartCanvas = document.getElementById('chart');
const cctx = chartCanvas.getContext('2d');
const colors = ['#6ee7b7','#60a5fa','#fbbf24','#f87171','#a78bfa','#fb923c'];

function renderCards() {
  grid.innerHTML = '';
  nodes.forEach(n => {
    const cls = n.health < 80 ? 'crit' : n.health < 95 ? 'warn' : '';
    grid.innerHTML += `<div class="card ${cls}"><h3>${n.name}</h3><div class="metric">${n.rps} rps</div><div class="sub">Latency: ${n.latency}ms · Health: ${n.health}% · Up: ${n.uptime}%</div></div>`;
  });
}

function drawChart() {
  cctx.clearRect(0, 0, 860, 200);
  cctx.strokeStyle = '#333'; cctx.lineWidth = 0.5;
  for (let y = 0; y < 200; y += 40) { cctx.beginPath(); cctx.moveTo(0, y); cctx.lineTo(860, y); cctx.stroke(); }
  nodes.forEach((n, ni) => {
    const data = history[ni];
    cctx.strokeStyle = colors[ni]; cctx.lineWidth = 1.5; cctx.beginPath();
    data.forEach((v, i) => { const x = (i / 59) * 860; const y = 190 - (v / 4000) * 180; i === 0 ? cctx.moveTo(x, y) : cctx.lineTo(x, y); });
    cctx.stroke();
  });
  cctx.fillStyle = '#888'; cctx.font = '10px sans-serif'; cctx.fillText('RPS over 60s', 5, 12);
}

function tick() {
  nodes.forEach((n, i) => {
    n.rps = Math.max(100, n.rps + Math.floor((Math.random() - 0.48) * 200));
    n.latency = Math.max(3, n.latency + Math.floor((Math.random() - 0.5) * 6));
    n.health = Math.min(100, Math.max(50, n.health + (Math.random() > 0.9 ? -5 : Math.random() > 0.7 ? 1 : 0)));
    history[i].push(n.rps); history[i].shift();
  });
  renderCards(); drawChart();
  document.getElementById('clock').textContent = new Date().toLocaleTimeString();
}
tick(); setInterval(tick, 1000);