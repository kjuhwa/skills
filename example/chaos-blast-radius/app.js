const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
canvas.width = Math.min(window.innerWidth - 40, 900);
canvas.height = Math.min(window.innerHeight - 120, 600);

const nodes = [
  { id: 'API Gateway', x: 450, y: 60 },
  { id: 'Auth', x: 200, y: 180 }, { id: 'Orders', x: 450, y: 180 }, { id: 'Catalog', x: 700, y: 180 },
  { id: 'Users DB', x: 120, y: 320 }, { id: 'Cache', x: 320, y: 320 },
  { id: 'Payments', x: 500, y: 320 }, { id: 'Inventory', x: 700, y: 320 },
  { id: 'Notify', x: 300, y: 440 }, { id: 'Shipping', x: 550, y: 440 },
].map(n => ({ ...n, x: n.x * (canvas.width / 900), y: n.y * (canvas.height / 600), state: 'healthy', radius: 24 }));

const edges = [
  [0,1],[0,2],[0,3],[1,4],[1,5],[2,5],[2,6],[3,7],[6,8],[6,9],[7,9]
];

let selected = null;
let propagating = false;

function getNeighbors(idx) {
  return edges.filter(e => e[0] === idx || e[1] === idx).map(e => e[0] === idx ? e[1] : e[0]);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  edges.forEach(([a, b]) => {
    ctx.beginPath(); ctx.moveTo(nodes[a].x, nodes[a].y); ctx.lineTo(nodes[b].x, nodes[b].y);
    const bad = nodes[a].state !== 'healthy' && nodes[b].state !== 'healthy';
    ctx.strokeStyle = bad ? '#f8717180' : '#2d333b'; ctx.lineWidth = bad ? 2 : 1; ctx.stroke();
  });
  nodes.forEach((n, i) => {
    ctx.beginPath(); ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
    const colors = { healthy: '#6ee7b7', failed: '#f87171', degraded: '#fbbf24' };
    ctx.fillStyle = i === selected ? colors[n.state] + 'cc' : colors[n.state] + '55';
    ctx.fill();
    ctx.strokeStyle = colors[n.state]; ctx.lineWidth = i === selected ? 3 : 1.5; ctx.stroke();
    ctx.fillStyle = '#c9d1d9'; ctx.font = '11px Segoe UI'; ctx.textAlign = 'center';
    ctx.fillText(n.id, n.x, n.y + n.radius + 14);
  });
}

canvas.addEventListener('click', e => {
  if (propagating) return;
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left, my = e.clientY - rect.top;
  selected = nodes.findIndex(n => Math.hypot(n.x - mx, n.y - my) < n.radius + 4);
  if (selected < 0) selected = null;
  document.getElementById('status').textContent = selected !== null ? `Selected: ${nodes[selected].id}` : 'Click a node, then inject failure';
  draw();
});

document.getElementById('injectBtn').addEventListener('click', () => {
  if (selected === null || propagating) return;
  propagating = true;
  nodes[selected].state = 'failed';
  const queue = [{ idx: selected, depth: 0 }];
  const visited = new Set([selected]);
  function step() {
    if (!queue.length) { propagating = false; document.getElementById('status').textContent = 'Propagation complete'; return; }
    const { idx, depth } = queue.shift();
    getNeighbors(idx).forEach(ni => {
      if (!visited.has(ni)) {
        visited.add(ni);
        nodes[ni].state = Math.random() < 0.6 ? 'failed' : 'degraded';
        queue.push({ idx: ni, depth: depth + 1 });
      }
    });
    draw();
    setTimeout(step, 500);
  }
  draw(); setTimeout(step, 400);
});

document.getElementById('resetBtn').addEventListener('click', () => {
  nodes.forEach(n => n.state = 'healthy'); selected = null; propagating = false;
  document.getElementById('status').textContent = 'Click a node, then inject failure'; draw();
});

draw();