const svg = document.getElementById('svg');
svg.setAttribute('width', '100%'); svg.setAttribute('height', '100%');
const ns = 'http://www.w3.org/2000/svg';

// arrow marker
const defs = document.createElementNS(ns, 'defs');
defs.innerHTML = '<marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="#3a3d47"/></marker>';
svg.appendChild(defs);

let nodes = [
  { id: 0, label: 'S3 Source', x: 80, y: 120, color: '#6ee7b7' },
  { id: 1, label: 'JSON Parse', x: 280, y: 80, color: '#60a5fa' },
  { id: 2, label: 'Filter Nulls', x: 280, y: 200, color: '#60a5fa' },
  { id: 3, label: 'Join', x: 480, y: 140, color: '#f59e0b' },
  { id: 4, label: 'Write DB', x: 680, y: 140, color: '#a78bfa' }
];
let edges = [[0,1],[0,2],[1,3],[2,3],[3,4]];
let nextId = 5, dragging = null, offset = {x:0,y:0}, linking = null;

function render() {
  svg.querySelectorAll('.edge,.node').forEach(e => e.remove());
  edges.forEach(([a, b]) => {
    const na = nodes.find(n=>n.id===a), nb = nodes.find(n=>n.id===b);
    if (!na || !nb) return;
    const line = document.createElementNS(ns, 'line');
    line.setAttribute('x1', na.x+50); line.setAttribute('y1', na.y+18);
    line.setAttribute('x2', nb.x-4); line.setAttribute('y2', nb.y+18);
    line.classList.add('edge'); svg.appendChild(line);
  });
  nodes.forEach(n => {
    const g = document.createElementNS(ns, 'g'); g.classList.add('node'); g.dataset.id = n.id;
    const r = document.createElementNS(ns, 'rect');
    r.setAttribute('x', n.x); r.setAttribute('y', n.y); r.setAttribute('width', 100); r.setAttribute('height', 36);
    r.setAttribute('fill', '#1a1d27'); r.setAttribute('stroke', n.color);
    const t = document.createElementNS(ns, 'text');
    t.setAttribute('x', n.x+50); t.setAttribute('y', n.y+22); t.setAttribute('text-anchor', 'middle'); t.textContent = n.label;
    g.appendChild(r); g.appendChild(t); svg.appendChild(g);
    r.addEventListener('mousedown', e => { dragging = n; offset = {x: e.clientX-n.x, y: e.clientY-n.y}; });
    r.addEventListener('dblclick', () => {
      if (!linking) { linking = n.id; r.setAttribute('stroke-width','3'); }
      else if (linking !== n.id) { edges.push([linking, n.id]); linking = null; render(); }
    });
  });
}

document.addEventListener('mousemove', e => { if (!dragging) return; dragging.x = e.clientX-offset.x; dragging.y = e.clientY-offset.y; render(); });
document.addEventListener('mouseup', () => { dragging = null; });

document.getElementById('addBtn').addEventListener('click', () => {
  const labels = ['Deduplicate','Aggregate','Encrypt','Compress','Validate','Normalize'];
  nodes.push({ id: nextId++, label: labels[Math.floor(Math.random()*labels.length)], x: 100+Math.random()*500, y: 60+Math.random()*300, color: '#f472b6' });
  render();
});

document.getElementById('runBtn').addEventListener('click', () => {
  const lines = svg.querySelectorAll('.edge');
  let i = 0;
  const iv = setInterval(() => { if (i < lines.length) lines[i++].classList.add('active'); else clearInterval(iv); }, 400);
  setTimeout(() => lines.forEach(l => l.classList.remove('active')), lines.length * 400 + 2000);
});

render();