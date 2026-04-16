const svg = document.getElementById('scene');
const NS = 'http://www.w3.org/2000/svg';

function el(tag, attrs) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  return e;
}

// Host tree: fixed legacy structure
const hostBranches = [
  { x1: 300, y1: 580, x2: 300, y2: 380, w: 18 },
  { x1: 300, y1: 380, x2: 200, y2: 260, w: 12 },
  { x1: 300, y1: 380, x2: 400, y2: 260, w: 12 },
  { x1: 200, y1: 260, x2: 140, y2: 160, w: 7 },
  { x1: 200, y1: 260, x2: 240, y2: 140, w: 7 },
  { x1: 400, y1: 260, x2: 460, y2: 160, w: 7 },
  { x1: 400, y1: 260, x2: 360, y2: 140, w: 7 },
  { x1: 300, y1: 380, x2: 300, y2: 220, w: 9 },
  { x1: 300, y1: 220, x2: 300, y2: 100, w: 5 }
];

// Fig vine branches — grown progressively
const figBranches = [];
let iter = 0, autoTimer = null;

function renderHost() {
  hostBranches.forEach((b, i) => {
    const ln = el('line', {
      x1: b.x1, y1: b.y1, x2: b.x2, y2: b.y2,
      stroke: '#78716c', 'stroke-width': b.w, 'stroke-linecap': 'round',
      'data-host': i, opacity: 0.8
    });
    svg.appendChild(ln);
  });
}

function wrapBranch(b, idx) {
  // produce a wavy path wrapping around the host segment
  const dx = b.x2 - b.x1, dy = b.y2 - b.y1;
  const len = Math.hypot(dx, dy);
  const ux = dx / len, uy = dy / len;
  const nx = -uy, ny = ux;
  const steps = Math.max(6, Math.floor(len / 12));
  let d = `M ${b.x1} ${b.y1}`;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const amp = Math.sin(t * Math.PI * 3) * 6;
    const x = b.x1 + ux * len * t + nx * amp;
    const y = b.y1 + uy * len * t + ny * amp;
    d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  const p = el('path', {
    d, stroke: '#6ee7b7', 'stroke-width': 2.5, fill: 'none',
    'stroke-linecap': 'round', 'stroke-dasharray': '400', 'stroke-dashoffset': '400',
    opacity: 0.9
  });
  svg.appendChild(p);
  requestAnimationFrame(() => {
    p.style.transition = 'stroke-dashoffset 1.2s ease-out';
    p.setAttribute('stroke-dashoffset', '0');
  });
  // node at tip
  const node = el('circle', { cx: b.x2, cy: b.y2, r: 0, fill: '#fbbf24', opacity: 0.9 });
  svg.appendChild(node);
  setTimeout(() => {
    node.setAttribute('r', '5');
    node.style.transition = 'r 0.4s';
  }, 700);
  // fade host branch
  const host = svg.querySelector(`[data-host="${idx}"]`);
  if (host) {
    host.style.transition = 'opacity 1.2s, stroke 1.2s';
    host.setAttribute('opacity', '0.25');
  }
  figBranches.push(p);
}

function growNext() {
  if (figBranches.length >= hostBranches.length) {
    stopAuto();
    return;
  }
  const idx = figBranches.length;
  wrapBranch(hostBranches[idx], idx);
  iter++;
  update();
}

function update() {
  const pct = Math.round((figBranches.length / hostBranches.length) * 100);
  document.getElementById('coverBar').style.width = pct + '%';
  document.getElementById('coverPct').textContent = pct + '%';
  document.getElementById('branchCount').textContent = figBranches.length;
  document.getElementById('iter').textContent = iter;
}

function reset() {
  stopAuto();
  svg.innerHTML = '';
  figBranches.length = 0;
  iter = 0;
  renderHost();
  update();
}

function stopAuto() { clearInterval(autoTimer); autoTimer = null; }

document.getElementById('grow').onclick = growNext;
document.getElementById('auto').onclick = () => {
  if (autoTimer) stopAuto();
  else autoTimer = setInterval(growNext, 1100);
};
document.getElementById('reset').onclick = reset;

// Initial background leaves flourish
function sprinkleLeaves() {
  for (let i = 0; i < 24; i++) {
    const c = el('circle', {
      cx: Math.random() * 600, cy: Math.random() * 600,
      r: Math.random() * 2 + 0.5,
      fill: '#6ee7b7', opacity: Math.random() * 0.3
    });
    svg.appendChild(c);
  }
}

renderHost();
sprinkleLeaves();
update();