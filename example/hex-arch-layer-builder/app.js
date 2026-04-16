const svg = document.getElementById('svg');
const toolbar = document.getElementById('toolbar');
const info = document.getElementById('info');
const CX = 350, CY = 250;
const rings = [
  { name: 'Domain', r: 70, color: '#6ee7b7' },
  { name: 'Ports', r: 140, color: '#3b82f6' },
  { name: 'Adapters', r: 220, color: '#f97316' }
];
const components = [
  { label: 'User Entity', layer: 'domain' }, { label: 'Order Service', layer: 'domain' },
  { label: 'InPort: CreateOrder', layer: 'port' }, { label: 'OutPort: SaveOrder', layer: 'port' },
  { label: 'InPort: GetUser', layer: 'port' }, { label: 'REST Controller', layer: 'adapter' },
  { label: 'Postgres Repo', layer: 'adapter' }, { label: 'Kafka Producer', layer: 'adapter' },
  { label: 'Redis Cache', layer: 'adapter' }
];
let placed = [];

function hexPoints(cx, cy, r) {
  return Array.from({ length: 6 }, (_, i) => {
    const a = Math.PI / 6 + i * Math.PI / 3;
    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
  }).join(' ');
}

function render() {
  svg.innerHTML = '';
  rings.slice().reverse().forEach(ring => {
    const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    poly.setAttribute('points', hexPoints(CX, CY, ring.r));
    poly.setAttribute('fill', ring.color + '10');
    poly.setAttribute('stroke', ring.color);
    poly.setAttribute('stroke-width', '1.5');
    svg.appendChild(poly);
    const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    t.setAttribute('x', CX); t.setAttribute('y', CY - ring.r + 14);
    t.setAttribute('text-anchor', 'middle'); t.setAttribute('fill', ring.color);
    t.setAttribute('font-size', '11'); t.textContent = ring.name;
    svg.appendChild(t);
  });
  placed.forEach((p, i) => {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.classList.add('placed');
    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.setAttribute('cx', p.x); c.setAttribute('cy', p.y); c.setAttribute('r', 22);
    c.setAttribute('fill', p.color + '33'); c.setAttribute('stroke', p.color);
    const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    t.setAttribute('x', p.x); t.setAttribute('y', p.y + 3);
    t.setAttribute('text-anchor', 'middle'); t.setAttribute('fill', p.color);
    t.textContent = p.label;
    g.appendChild(c); g.appendChild(t);
    g.addEventListener('click', () => { placed.splice(i, 1); render(); });
    svg.appendChild(g);
  });
}

components.forEach(comp => {
  const chip = document.createElement('div');
  chip.className = `chip ${comp.layer}`;
  chip.textContent = comp.label;
  chip.draggable = true;
  chip.addEventListener('dragstart', e => e.dataTransfer.setData('text/plain', JSON.stringify(comp)));
  toolbar.appendChild(chip);
});

const board = document.getElementById('board');
board.addEventListener('dragover', e => e.preventDefault());
board.addEventListener('drop', e => {
  e.preventDefault();
  const comp = JSON.parse(e.dataTransfer.getData('text/plain'));
  const rect = svg.getBoundingClientRect();
  const scaleX = 700 / rect.width, scaleY = 500 / rect.height;
  const x = (e.clientX - rect.left) * scaleX, y = (e.clientY - rect.top) * scaleY;
  const colorMap = { domain: '#6ee7b7', port: '#3b82f6', adapter: '#f97316' };
  placed.push({ label: comp.label, x, y, color: colorMap[comp.layer] });
  render();
  info.textContent = `Placed: ${comp.label} — click to remove`;
});
render();