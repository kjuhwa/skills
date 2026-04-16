const svg = document.getElementById('canvas');
let nodes = [], edges = [], selected = null, idCounter = 0, dragNode = null, offset = { x: 0, y: 0 };
const colors = { client: '#6ee7b7', bff: '#f59e0b', service: '#818cf8', db: '#f472b6' };
const labels = { client: 'Client', bff: 'BFF', service: 'Service', db: 'Database' };

function render() {
  svg.innerHTML = '';
  edges.forEach(e => {
    const a = nodes.find(n => n.id === e[0]), b = nodes.find(n => n.id === e[1]);
    if (!a || !b) return;
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    Object.entries({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: '#6ee7b744', 'stroke-width': 2 }).forEach(([k, v]) => line.setAttribute(k, v));
    svg.appendChild(line);
  });
  nodes.forEach(n => {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('transform', `translate(${n.x},${n.y})`);
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    Object.entries({ x: -48, y: -20, width: 96, height: 40, rx: 8, fill: '#1a1d27', stroke: selected === n.id ? '#fff' : colors[n.type], 'stroke-width': 2 }).forEach(([k, v]) => rect.setAttribute(k, v));
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    Object.entries({ 'text-anchor': 'middle', dy: '0.35em', fill: colors[n.type], 'font-size': '12' }).forEach(([k, v]) => text.setAttribute(k, v));
    text.textContent = n.label;
    g.appendChild(rect); g.appendChild(text);
    g.style.cursor = 'pointer';
    g.addEventListener('mousedown', e => { e.preventDefault(); dragNode = n; offset = { x: e.offsetX - n.x, y: e.offsetY - n.y }; });
    g.addEventListener('click', e => {
      e.stopPropagation();
      if (selected && selected !== n.id) {
        if (!edges.find(e => (e[0] === selected && e[1] === n.id) || (e[0] === n.id && e[1] === selected)))
          edges.push([selected, n.id]);
        selected = null;
      } else { selected = n.id; }
      render();
    });
    svg.appendChild(g);
  });
}

svg.addEventListener('mousemove', e => {
  if (!dragNode) return;
  dragNode.x = e.offsetX - offset.x; dragNode.y = e.offsetY - offset.y; render();
});
svg.addEventListener('mouseup', () => { dragNode = null; });
svg.addEventListener('click', () => { selected = null; render(); });

document.querySelectorAll('.item').forEach(el => {
  el.addEventListener('dragstart', e => e.dataTransfer.setData('type', el.dataset.type));
});
svg.addEventListener('dragover', e => e.preventDefault());
svg.addEventListener('drop', e => {
  e.preventDefault();
  const type = e.dataTransfer.getData('type');
  const rect = svg.getBoundingClientRect();
  nodes.push({ id: ++idCounter, type, label: labels[type] + ' ' + idCounter, x: e.clientX - rect.left, y: e.clientY - rect.top });
  render();
});

function clearAll() { nodes = []; edges = []; selected = null; render(); }
function loadPreset() {
  clearAll(); idCounter = 0;
  const presetNodes = [
    { type: 'client', label: '📱 Mobile', x: 80, y: 80 },
    { type: 'client', label: '🖥️ Web', x: 80, y: 220 },
    { type: 'bff', label: 'Mobile BFF', x: 280, y: 80 },
    { type: 'bff', label: 'Web BFF', x: 280, y: 220 },
    { type: 'service', label: 'User Svc', x: 500, y: 60 },
    { type: 'service', label: 'Order Svc', x: 500, y: 160 },
    { type: 'service', label: 'Product Svc', x: 500, y: 260 },
    { type: 'db', label: 'User DB', x: 680, y: 60 },
    { type: 'db', label: 'Order DB', x: 680, y: 160 },
  ];
  presetNodes.forEach(p => nodes.push({ ...p, id: ++idCounter }));
  edges = [[1,3],[2,4],[3,5],[3,6],[4,5],[4,6],[4,7],[5,8],[6,9]];
  render();
}
loadPreset();