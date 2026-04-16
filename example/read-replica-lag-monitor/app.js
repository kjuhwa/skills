const names = ['us-east-1a', 'us-east-1b', 'eu-west-1a', 'ap-south-1a'];
const colors = ['#6ee7b7', '#60a5fa', '#f59e0b', '#c084fc'];
const history = names.map(() => []);
const maxPts = 60;
const grid = document.getElementById('grid');
const svg = document.getElementById('chart');

names.forEach((n, i) => {
  const card = document.createElement('div');
  card.className = 'card'; card.id = 'c' + i;
  card.innerHTML = `<h3>${n}</h3><div class="val" id="v${i}">0ms</div><div class="sub">replication lag</div>`;
  grid.appendChild(card);
});

function tick() {
  names.forEach((_, i) => {
    const base = 5 + i * 8;
    const lag = Math.max(0, base + (Math.random() - 0.4) * 30 + Math.sin(Date.now() / 2000 + i) * 10);
    history[i].push(lag);
    if (history[i].length > maxPts) history[i].shift();
    const el = document.getElementById('v' + i);
    const card = document.getElementById('c' + i);
    el.textContent = lag.toFixed(0) + 'ms';
    el.className = 'val' + (lag > 40 ? ' crit' : lag > 25 ? ' warn' : '');
    card.className = 'card' + (lag > 40 ? ' crit' : lag > 25 ? ' warn' : '');
  });
  drawChart();
}

function drawChart() {
  const W = 760, H = 220, pad = 40;
  let s = `<text x="${pad}" y="16" fill="#8b949e" font-size="11">Lag History (last 60s)</text>`;
  for (let y = 0; y <= 60; y += 20) {
    const py = pad + (H - pad * 2) * (1 - y / 60);
    s += `<line x1="${pad}" y1="${py}" x2="${W - 10}" y2="${py}" stroke="#2a2d37"/>`;
    s += `<text x="4" y="${py + 4}" fill="#484f58" font-size="10">${y}ms</text>`;
  }
  names.forEach((_, i) => {
    const pts = history[i].map((v, j) => {
      const x = pad + j * ((W - pad - 10) / maxPts);
      const y = pad + (H - pad * 2) * (1 - Math.min(v, 60) / 60);
      return `${x},${y}`;
    }).join(' ');
    if (pts) s += `<polyline points="${pts}" fill="none" stroke="${colors[i]}" stroke-width="1.5" opacity="0.85"/>`;
  });
  svg.innerHTML = s;
}

setInterval(tick, 1000); tick();