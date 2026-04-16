const ops = ['get', 'put', 'del', 'list'];
const opColors = { get: '#6ee7b7', put: '#60a5fa', del: '#fb7185', list: '#a78bfa' };
const history = { get: [], put: [], del: [], list: [] };
const MAX = 60;
const svg = document.getElementById('chart');
const logEl = document.getElementById('log');

function latency(op) {
  const base = { get: 22, put: 45, del: 18, list: 70 };
  return base[op] + Math.random() * base[op] * 1.2 + (Math.random() < .07 ? Math.random() * 200 : 0);
}

function polyline(data, color) {
  if (data.length < 2) return '';
  const maxY = 250, h = 240, w = 860, pad = 10;
  const pts = data.map((v, i) => `${pad + (i / (MAX - 1)) * w},${h - (v / maxY) * (h - 20) + 10}`).join(' ');
  return `<polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.5" opacity="0.8"/>`;
}

function render() {
  let svgContent = '';
  for (let i = 0; i <= 4; i++) {
    const y = 10 + i * 55;
    svgContent += `<line x1="10" y1="${y}" x2="870" y2="${y}" stroke="#2a2d37" stroke-width="0.5"/>`;
    svgContent += `<text x="4" y="${y + 4}" fill="#555" font-size="9">${250 - i * 62}ms</text>`;
  }
  ops.forEach(op => { svgContent += polyline(history[op], opColors[op]); });
  svg.innerHTML = svgContent;
}

function tick() {
  const op = ops[Math.random() * 4 | 0];
  const ms = latency(op);
  history[op].push(ms);
  if (history[op].length > MAX) history[op].shift();
  document.getElementById(`${op}-val`).textContent = ms.toFixed(0);
  const card = document.getElementById(`${op}-card`);
  card.style.borderColor = ms > 150 ? '#fb7185' : opColors[op];
  const names = { get: 'GetObject', put: 'PutObject', del: 'DeleteObject', list: 'ListBucket' };
  const key = `bucket-${(Math.random()*5|0)}/obj-${(Math.random()*999|0).toString().padStart(3,'0')}`;
  logEl.innerHTML = `<div class="log-${op}">${new Date().toLocaleTimeString()} ${names[op].padEnd(13)} ${ms.toFixed(1).padStart(6)}ms  ${key}</div>` + logEl.innerHTML;
  if (logEl.children.length > 40) logEl.removeChild(logEl.lastChild);
  render();
}

setInterval(tick, 400);
for (let i = 0; i < 30; i++) tick();