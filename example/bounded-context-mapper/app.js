const svg = document.getElementById('canvas');
const sel = document.getElementById('sel');
const relsList = document.getElementById('rels');
const NS = 'http://www.w3.org/2000/svg';

const contexts = [
  { id: 'orders', name: 'Orders', sub: 'Sales Subdomain', x: 120, y: 100 },
  { id: 'inventory', name: 'Inventory', sub: 'Supporting', x: 420, y: 80 },
  { id: 'shipping', name: 'Shipping', sub: 'Generic', x: 700, y: 180 },
  { id: 'billing', name: 'Billing', sub: 'Core', x: 200, y: 320 },
  { id: 'catalog', name: 'Catalog', sub: 'Supporting', x: 500, y: 360 },
];
const links = [
  { from: 'orders', to: 'inventory', kind: 'U/D' },
  { from: 'orders', to: 'billing', kind: 'SK' },
  { from: 'orders', to: 'shipping', kind: 'ACL' },
];
let currentRel = 'U/D';
let selected = null;
let dragging = null;

document.querySelectorAll('[data-rel]').forEach(b => {
  b.addEventListener('click', () => {
    document.querySelectorAll('[data-rel]').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    currentRel = b.dataset.rel;
  });
});
document.querySelector('[data-rel="U/D"]').classList.add('active');
document.getElementById('clear').addEventListener('click', () => { links.length = 0; render(); });

function render() {
  svg.innerHTML = '';
  links.forEach(l => {
    const a = contexts.find(c => c.id === l.from);
    const b = contexts.find(c => c.id === l.to);
    const path = document.createElementNS(NS, 'line');
    path.setAttribute('class', 'link');
    path.setAttribute('x1', a.x + 70); path.setAttribute('y1', a.y + 35);
    path.setAttribute('x2', b.x + 70); path.setAttribute('y2', b.y + 35);
    svg.appendChild(path);
    const lbl = document.createElementNS(NS, 'text');
    lbl.setAttribute('class', 'link-label');
    lbl.setAttribute('x', (a.x + b.x) / 2 + 70);
    lbl.setAttribute('y', (a.y + b.y) / 2 + 30);
    lbl.textContent = l.kind;
    svg.appendChild(lbl);
  });
  contexts.forEach(c => {
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('transform', `translate(${c.x},${c.y})`);
    const rect = document.createElementNS(NS, 'rect');
    rect.setAttribute('class', 'context-rect' + (selected === c.id ? ' selected' : ''));
    rect.setAttribute('width', 140); rect.setAttribute('height', 70); rect.setAttribute('rx', 8);
    g.appendChild(rect);
    const t1 = document.createElementNS(NS, 'text');
    t1.setAttribute('class', 'context-label');
    t1.setAttribute('x', 70); t1.setAttribute('y', 32); t1.setAttribute('text-anchor', 'middle');
    t1.textContent = c.name;
    g.appendChild(t1);
    const t2 = document.createElementNS(NS, 'text');
    t2.setAttribute('class', 'context-sub');
    t2.setAttribute('x', 70); t2.setAttribute('y', 50); t2.setAttribute('text-anchor', 'middle');
    t2.textContent = c.sub;
    g.appendChild(t2);
    g.addEventListener('mousedown', e => onDown(e, c));
    g.addEventListener('click', e => { e.stopPropagation(); onSelect(c); });
    svg.appendChild(g);
  });
  sel.textContent = selected || 'none';
  relsList.innerHTML = links.map(l => `<li>${l.from} → ${l.to} <strong style="color:#6ee7b7">[${l.kind}]</strong></li>`).join('');
}

function onSelect(c) {
  if (!selected) { selected = c.id; render(); return; }
  if (selected === c.id) { selected = null; render(); return; }
  links.push({ from: selected, to: c.id, kind: currentRel });
  selected = null; render();
}
function onDown(e, c) {
  dragging = { c, ox: e.clientX - c.x, oy: e.clientY - c.y };
}
window.addEventListener('mousemove', e => {
  if (!dragging) return;
  dragging.c.x = e.clientX - dragging.ox;
  dragging.c.y = e.clientY - dragging.oy;
  render();
});
window.addEventListener('mouseup', () => dragging = null);
render();