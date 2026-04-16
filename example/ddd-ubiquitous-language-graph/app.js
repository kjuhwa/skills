const svg = document.getElementById('graph');
const info = document.getElementById('info');
const W = Math.min(window.innerWidth - 40, 900), H = Math.min(window.innerHeight - 100, 520);
svg.setAttribute('width', W); svg.setAttribute('height', H);

const terms = [
  { id: 'aggregate', label: 'Aggregate', def: 'A cluster of domain objects treated as a single unit for data changes.' },
  { id: 'entity', label: 'Entity', def: 'An object with a distinct identity that persists over time.' },
  { id: 'value-obj', label: 'Value Object', def: 'An immutable object defined by its attributes, not identity.' },
  { id: 'repository', label: 'Repository', def: 'Mediates between domain and data mapping layers.' },
  { id: 'domain-event', label: 'Domain Event', def: 'A record of something significant that happened in the domain.' },
  { id: 'service', label: 'Domain Service', def: 'Stateless operation that doesn\'t belong to any entity.' },
  { id: 'factory', label: 'Factory', def: 'Encapsulates complex object creation logic.' },
  { id: 'specification', label: 'Specification', def: 'A predicate that determines if an object satisfies criteria.' },
  { id: 'bounded-ctx', label: 'Bounded Context', def: 'An explicit boundary within which a domain model is defined.' },
  { id: 'anti-corruption', label: 'ACL', def: 'A translation layer isolating one model from another.' },
];

const edges = [
  ['aggregate', 'entity'], ['aggregate', 'value-obj'], ['aggregate', 'domain-event'],
  ['repository', 'aggregate'], ['factory', 'aggregate'], ['service', 'domain-event'],
  ['specification', 'entity'], ['bounded-ctx', 'aggregate'], ['bounded-ctx', 'anti-corruption'],
  ['service', 'repository'], ['factory', 'value-obj'],
];

const nodes = terms.map((t, i) => {
  const a = (i / terms.length) * Math.PI * 2;
  return { ...t, x: W / 2 + Math.cos(a) * 180 + (Math.random() - 0.5) * 60, y: H / 2 + Math.sin(a) * 150 + (Math.random() - 0.5) * 60, vx: 0, vy: 0 };
});
const byId = id => nodes.find(n => n.id === id);

function tick() {
  nodes.forEach(a => {
    nodes.forEach(b => { if (a === b) return; let dx = a.x - b.x, dy = a.y - b.y, d = Math.max(Math.hypot(dx, dy), 1); const f = 800 / (d * d); a.vx += (dx / d) * f; a.vy += (dy / d) * f; });
    a.vx += (W / 2 - a.x) * 0.002; a.vy += (H / 2 - a.y) * 0.002;
  });
  edges.forEach(([ai, bi]) => { const a = byId(ai), b = byId(bi); let dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1; const f = (d - 120) * 0.01; a.vx += (dx / d) * f; a.vy += (dy / d) * f; b.vx -= (dx / d) * f; b.vy -= (dy / d) * f; });
  nodes.forEach(n => { n.vx *= 0.88; n.vy *= 0.88; n.x += n.vx; n.y += n.vy; n.x = Math.max(40, Math.min(W - 40, n.x)); n.y = Math.max(40, Math.min(H - 40, n.y)); });
}

function render() {
  svg.innerHTML = '';
  edges.forEach(([ai, bi]) => {
    const a = byId(ai), b = byId(bi), line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    Object.entries({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: '#2d333b', 'stroke-width': 1.5 }).forEach(([k, v]) => line.setAttribute(k, v));
    svg.appendChild(line);
  });
  nodes.forEach(n => {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    Object.entries({ cx: n.x, cy: n.y, r: 22, fill: '#6ee7b718', stroke: '#6ee7b7', 'stroke-width': 1.5 }).forEach(([k, v]) => c.setAttribute(k, v));
    const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    Object.entries({ x: n.x, y: n.y + 4, fill: '#c9d1d9', 'font-size': '10', 'text-anchor': 'middle', 'font-family': 'sans-serif' }).forEach(([k, v]) => t.setAttribute(k, v));
    t.textContent = n.label;
    g.appendChild(c); g.appendChild(t);
    g.addEventListener('mouseenter', () => { info.style.display = 'block'; info.innerHTML = `<strong>${n.label}</strong><br>${n.def}`; c.setAttribute('stroke', '#fff'); c.setAttribute('r', 28); });
    g.addEventListener('mouseleave', () => { info.style.display = 'none'; c.setAttribute('stroke', '#6ee7b7'); c.setAttribute('r', 22); });
    svg.appendChild(g);
  });
}

let frame = 0;
(function loop() { tick(); render(); if (++frame < 300) requestAnimationFrame(loop); })();