const svg = document.getElementById('svg');
const hint = document.getElementById('hint');
const NS = 'http://www.w3.org/2000/svg';
let nodes = [], links = [], linkMode = false, linkStart = null, dragNode = null, offset = { x: 0, y: 0 };
let idCounter = 0;

const colors = { client: '#f472b6', bff: '#6ee7b7', service: '#60a5fa' };
const labels = { client: 'Client', bff: 'BFF', service: 'Service' };

function addNode(type, x, y) {
  const id = idCounter++;
  x = x || 100 + Math.random() * 600;
  y = y || 60 + Math.random() * 340;
  const g = document.createElementNS(NS, 'g');
  g.setAttribute('transform', `translate(${x},${y})`);
  g.dataset.id = id;
  const rect = document.createElementNS(NS, 'rect');
  rect.setAttribute('x', -45); rect.setAttribute('y', -18);
  rect.setAttribute('width', 90); rect.setAttribute('height', 36);
  rect.setAttribute('rx', 8); rect.setAttribute('fill', colors[type] + '22');
  rect.setAttribute('stroke', colors[type]); rect.setAttribute('stroke-width', 1.5);
  const text = document.createElementNS(NS, 'text');
  text.setAttribute('text-anchor', 'middle'); text.setAttribute('dy', '4');
  text.setAttribute('fill', '#c9d1d9'); text.setAttribute('font-size', '12');
  text.textContent = labels[type] + ' ' + id;
  g.appendChild(rect); g.appendChild(text);
  svg.appendChild(g);
  const node = { id, type, x, y, el: g };
  nodes.push(node);
  g.addEventListener('mousedown', e => {
    if (linkMode) { handleLinkClick(node); return; }
    dragNode = node;
    offset.x = e.clientX - node.x;
    offset.y = e.clientY - node.y;
  });
  return node;
}

function handleLinkClick(node) {
  if (!linkStart) { linkStart = node; node.el.querySelector('rect').setAttribute('stroke-width', 3); return; }
  if (linkStart.id !== node.id) {
    const line = document.createElementNS(NS, 'line');
    line.setAttribute('stroke', '#6ee7b755'); line.setAttribute('stroke-width', 1.5);
    svg.insertBefore(line, svg.firstChild);
    links.push({ from: linkStart, to: node, el: line });
    updateLinks();
  }
  linkStart.el.querySelector('rect').setAttribute('stroke-width', 1.5);
  linkStart = null;
}

function updateLinks() {
  links.forEach(l => {
    l.el.setAttribute('x1', l.from.x); l.el.setAttribute('y1', l.from.y);
    l.el.setAttribute('x2', l.to.x); l.el.setAttribute('y2', l.to.y);
  });
}

svg.addEventListener('mousemove', e => {
  if (!dragNode) return;
  const r = svg.getBoundingClientRect();
  dragNode.x = e.clientX - offset.x;
  dragNode.y = e.clientY - offset.y;
  dragNode.el.setAttribute('transform', `translate(${dragNode.x},${dragNode.y})`);
  updateLinks();
});

document.addEventListener('mouseup', () => { dragNode = null; });

function toggleLink() { linkMode = !linkMode; hint.style.display = linkMode ? 'block' : 'none'; linkStart = null; }
function clearAll() { svg.innerHTML = ''; nodes = []; links = []; idCounter = 0; buildDemo(); }

function buildDemo() {
  const c1 = addNode('client', 100, 120);
  const c2 = addNode('client', 100, 300);
  const b1 = addNode('bff', 370, 120);
  const b2 = addNode('bff', 370, 300);
  const s1 = addNode('service', 640, 80);
  const s2 = addNode('service', 640, 220);
  const s3 = addNode('service', 640, 360);
  [[c1,b1],[c2,b2],[b1,s1],[b1,s2],[b2,s2],[b2,s3]].forEach(([a,b]) => {
    const line = document.createElementNS(NS, 'line');
    line.setAttribute('stroke', '#6ee7b755'); line.setAttribute('stroke-width', 1.5);
    svg.insertBefore(line, svg.firstChild);
    links.push({ from: a, to: b, el: line });
  });
  updateLinks();
}
buildDemo();