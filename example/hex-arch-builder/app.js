const stack = document.getElementById('stack');
const svg = document.getElementById('diagram');
const info = document.getElementById('info');
let layers = [];

const colors = {
  'driving-adapter': '#3b82f6', 'driving-port': '#6ee7b7', 'use-case': '#f59e0b',
  'entity': '#ec4899', 'driven-port': '#6ee7b7', 'driven-adapter': '#8b5cf6'
};
const descriptions = {
  'driving-adapter': 'External actors (REST, CLI, UI) that invoke the application.',
  'driving-port': 'Interfaces the application exposes for incoming interactions.',
  'use-case': 'Application services orchestrating business logic.',
  'entity': 'Core domain objects with business rules.',
  'driven-port': 'Interfaces the domain defines for outgoing needs.',
  'driven-adapter': 'Infrastructure implementations (DB, API, queues).'
};

document.querySelectorAll('.chip').forEach(chip => {
  chip.addEventListener('dragstart', e => e.dataTransfer.setData('type', chip.dataset.type));
});

stack.addEventListener('dragover', e => e.preventDefault());
stack.addEventListener('drop', e => {
  e.preventDefault();
  const type = e.dataTransfer.getData('type');
  if (type) addLayer(type);
});

function addLayer(type) {
  layers.push(type);
  renderStack();
  renderDiagram();
}

function renderStack() {
  stack.innerHTML = '';
  layers.forEach((l, i) => {
    const d = document.createElement('div');
    d.className = 'item';
    d.innerHTML = `<span>${l}</span><span class="x" data-i="${i}">&times;</span>`;
    stack.appendChild(d);
  });
  stack.querySelectorAll('.x').forEach(x => x.onclick = () => { layers.splice(+x.dataset.i, 1); renderStack(); renderDiagram(); });
}

function hexPoints(cx, cy, r) {
  return Array.from({ length: 6 }, (_, i) => {
    const a = Math.PI / 3 * i - Math.PI / 6;
    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
  }).join(' ');
}

function renderDiagram() {
  svg.innerHTML = '';
  const cx = 300, cy = 300;
  if (!layers.length) {
    info.textContent = 'Drag components from the palette to the stack to build your hexagonal architecture.';
    return;
  }
  const n = layers.length;
  layers.slice().reverse().forEach((l, i) => {
    const r = 80 + (n - i) * 38;
    const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    poly.setAttribute('points', hexPoints(cx, cy, r));
    poly.setAttribute('fill', colors[l] + '15');
    poly.setAttribute('stroke', colors[l]);
    poly.setAttribute('stroke-width', '2');
    svg.appendChild(poly);
    const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    txt.setAttribute('x', cx); txt.setAttribute('y', cy - r + 16);
    txt.setAttribute('text-anchor', 'middle'); txt.setAttribute('fill', colors[l]);
    txt.setAttribute('font-size', '11'); txt.textContent = l;
    svg.appendChild(txt);
  });
  info.textContent = descriptions[layers[layers.length - 1]];
}

document.getElementById('btnClear').onclick = () => { layers = []; renderStack(); renderDiagram(); };

['driving-adapter', 'driving-port', 'use-case', 'entity', 'driven-port', 'driven-adapter'].forEach(addLayer);