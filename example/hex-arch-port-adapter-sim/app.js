const svg = document.getElementById('hex-svg');
const log = document.getElementById('log');
const ns = 'http://www.w3.org/2000/svg';
const cx = 300, cy = 200, R = 120;

function hexPoints(x, y, r) {
  return Array.from({length: 6}, (_, i) => {
    const a = Math.PI / 3 * i - Math.PI / 6;
    return `${x + r * Math.cos(a)},${y + r * Math.sin(a)}`;
  }).join(' ');
}

function el(tag, attrs) {
  const e = document.createElementNS(ns, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}

// Draw core hexagon
svg.appendChild(el('polygon', { points: hexPoints(cx, cy, R), fill: 'none', stroke: '#6ee7b7', 'stroke-width': 2 }));
svg.appendChild(el('text', { x: cx, y: cy + 5, fill: '#fbbf24', 'text-anchor': 'middle', 'font-size': '14', 'font-weight': 'bold' }));
svg.lastChild.textContent = 'Domain Core';

const ports = [
  { label: 'HTTP In', angle: Math.PI, type: 'in' },
  { label: 'CLI In', angle: Math.PI * 4/3, type: 'in' },
  { label: 'MQ In', angle: Math.PI * 2/3, type: 'in' },
  { label: 'DB Out', angle: 0, type: 'out' },
  { label: 'API Out', angle: Math.PI / 3, type: 'out' },
  { label: 'Event Out', angle: -Math.PI / 3, type: 'out' },
];

const portEls = [];
ports.forEach(p => {
  const px = cx + (R + 60) * Math.cos(p.angle);
  const py = cy + (R + 60) * Math.sin(p.angle);
  const ex = cx + R * Math.cos(p.angle);
  const ey = cy + R * Math.sin(p.angle);
  svg.appendChild(el('line', { x1: ex, y1: ey, x2: px, y2: py, stroke: p.type === 'in' ? '#6ee7b7' : '#60a5fa', 'stroke-width': 1.5, 'stroke-dasharray': '4' }));
  const circle = el('circle', { cx: px, cy: py, r: 18, fill: '#1a1d27', stroke: p.type === 'in' ? '#6ee7b7' : '#60a5fa', 'stroke-width': 2 });
  svg.appendChild(circle);
  const txt = el('text', { x: px, y: py + 4, fill: '#c9d1d9', 'text-anchor': 'middle', 'font-size': '9' });
  txt.textContent = p.label;
  svg.appendChild(txt);
  portEls.push({ circle, px, py, ex, ey, ...p });
});

let animId = 0;
function sendMessage(type) {
  const src = type === 'HTTP Request' ? 0 : type === 'DB Query' ? 3 : 5;
  const pe = portEls[src];
  const id = ++animId;
  const dot = el('circle', { cx: pe.px, cy: pe.py, r: 6, fill: pe.type === 'in' ? '#6ee7b7' : '#60a5fa' });
  svg.appendChild(dot);
  addLog(`→ ${type} enters via ${pe.label}`, 'log-in');
  let t = 0;
  const anim = () => {
    t += 0.025;
    if (t >= 1) { svg.removeChild(dot); addLog(`⚙ Core processes ${type}`, 'log-core');
      setTimeout(() => { const tgt = portEls[pe.type === 'in' ? 3 + (id % 3) : (id % 3)];
        addLog(`← Response via ${tgt.label}`, 'log-out'); flashPort(tgt); }, 400);
      return; }
    dot.setAttribute('cx', pe.px + (pe.ex - pe.px) * t);
    dot.setAttribute('cy', pe.py + (pe.ey - pe.py) * t);
    requestAnimationFrame(anim);
  };
  requestAnimationFrame(anim);
}

function flashPort(p) {
  p.circle.setAttribute('fill', '#6ee7b7');
  setTimeout(() => p.circle.setAttribute('fill', '#1a1d27'), 400);
}

function addLog(msg, cls) {
  const d = document.createElement('div');
  d.className = cls; d.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  log.prepend(d);
  if (log.children.length > 50) log.lastChild.remove();
}

sendMessage('HTTP Request');