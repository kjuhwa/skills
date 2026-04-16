const svg = document.getElementById('pipeline');
const NS = 'http://www.w3.org/2000/svg';
const stages = [
  { id: 'sources', label: 'Sources', x: 60, y: 60, items: ['nginx', 'app-server', 'k8s-pods', 'cron-jobs'] },
  { id: 'collect', label: 'Collectors', x: 280, y: 160, items: ['fluentd', 'filebeat'] },
  { id: 'process', label: 'Processing', x: 500, y: 60, items: ['parse', 'enrich', 'filter', 'sample'] },
  { id: 'store', label: 'Storage', x: 720, y: 160, items: ['elasticsearch', 'S3-archive'] },
  { id: 'alert', label: 'Alerts', x: 720, y: 340, items: ['pagerduty', 'slack'] }
];
const edges = [['sources','collect'],['collect','process'],['process','store'],['store','alert']];
const throughput = { sources: 0, collect: 0, process: 0, store: 0, alert: 0 };
const particles = [];

function el(tag, attrs) {
  const e = document.createElementNS(NS, tag);
  Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
  return e;
}

edges.forEach(([a, b]) => {
  const sa = stages.find(s => s.id === a), sb = stages.find(s => s.id === b);
  const line = el('line', { x1: sa.x + 80, y1: sa.y + 30, x2: sb.x, y2: sb.y + 30, stroke: '#2a2d37', 'stroke-width': 2, 'stroke-dasharray': '6,4' });
  svg.appendChild(line);
});

stages.forEach(s => {
  const g = el('g', { transform: `translate(${s.x},${s.y})` });
  g.appendChild(el('rect', { width: 160, height: 60 + s.items.length * 18, rx: 8, fill: '#1a1d27', stroke: '#2a2d37', 'stroke-width': 1 }));
  const title = el('text', { x: 80, y: 22, fill: '#6ee7b7', 'font-size': 13, 'text-anchor': 'middle', 'font-weight': 'bold' });
  title.textContent = s.label;
  g.appendChild(title);
  s.items.forEach((item, i) => {
    const t = el('text', { x: 80, y: 44 + i * 18, fill: '#565f89', 'font-size': 11, 'text-anchor': 'middle' });
    t.textContent = item;
    g.appendChild(t);
  });
  const counter = el('text', { x: 80, y: 56 + s.items.length * 18, fill: '#9ece6a', 'font-size': 10, 'text-anchor': 'middle', id: `count-${s.id}` });
  counter.textContent = '0 evt/s';
  g.appendChild(counter);
  svg.appendChild(g);
});

function spawnParticle() {
  const idx = Math.floor(Math.random() * edges.length);
  const [a, b] = edges[idx];
  const sa = stages.find(s => s.id === a), sb = stages.find(s => s.id === b);
  particles.push({ x: sa.x + 80, y: sa.y + 30, tx: sb.x, ty: sb.y + 30, p: 0, speed: 0.01 + Math.random() * 0.02, from: a, to: b });
  throughput[a]++;
}

function animate() {
  svg.querySelectorAll('.particle').forEach(p => p.remove());
  particles.forEach((p, i) => {
    p.p += p.speed;
    if (p.p >= 1) { throughput[p.to]++; particles.splice(i, 1); return; }
    const cx = p.x + (p.tx - p.x) * p.p, cy = p.y + (p.ty - p.y) * p.p;
    const dot = el('circle', { cx, cy, r: 3, fill: '#6ee7b7', opacity: 1 - p.p * 0.5, class: 'particle' });
    svg.appendChild(dot);
  });
  requestAnimationFrame(animate);
}

setInterval(spawnParticle, 120);
setInterval(() => {
  stages.forEach(s => {
    const e = document.getElementById(`count-${s.id}`);
    if (e) e.textContent = throughput[s.id] + ' evt/s';
  });
}, 1000);

const metricsEl = document.getElementById('metrics');
['Ingestion Rate', 'Avg Latency', 'Drop Rate', 'Storage'].forEach((lbl, i) => {
  const d = document.createElement('div');
  d.className = 'm';
  d.innerHTML = `<div class="val" id="mv${i}">0</div><div class="lbl">${lbl}</div>`;
  metricsEl.appendChild(d);
});
setInterval(() => {
  document.getElementById('mv0').textContent = (throughput.sources * 8) + '/s';
  document.getElementById('mv1').textContent = (12 + Math.random() * 8).toFixed(0) + 'ms';
  document.getElementById('mv2').textContent = (Math.random() * 0.5).toFixed(2) + '%';
  document.getElementById('mv3').textContent = (2.4 + throughput.store * 0.001).toFixed(1) + 'GB';
}, 1000);

animate();