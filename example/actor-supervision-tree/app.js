const svg = document.getElementById('tree');
const stats = document.getElementById('stats');
const strategySel = document.getElementById('strategy');

let nextId = 0;
function mkNode(name, kind, children = []) {
  return { id: nextId++, name, kind, status: 'alive', restarts: 0, children };
}

function buildTree() {
  return mkNode('root', 'supervisor', [
    mkNode('api-sup', 'supervisor', [
      mkNode('http-1', 'worker'),
      mkNode('http-2', 'worker'),
      mkNode('http-3', 'worker')
    ]),
    mkNode('db-sup', 'supervisor', [
      mkNode('pool-1', 'worker'),
      mkNode('pool-2', 'worker')
    ]),
    mkNode('job-sup', 'supervisor', [
      mkNode('worker-a', 'worker'),
      mkNode('worker-b', 'worker'),
      mkNode('worker-c', 'worker')
    ])
  ]);
}

let root = buildTree();
let totalCrashes = 0;
let totalRestarts = 0;

function layout(node, x, y, w, depth = 0) {
  node.x = x;
  node.y = y;
  if (node.children.length) {
    const step = w / node.children.length;
    node.children.forEach((c, i) => {
      layout(c, x - w / 2 + step / 2 + i * step, y + 110, step * 0.9, depth + 1);
    });
  }
}

function render() {
  svg.innerHTML = '';
  const ns = 'http://www.w3.org/2000/svg';
  const rect = svg.getBoundingClientRect();
  layout(root, rect.width / 2, 50, rect.width * 0.9);

  function drawEdges(n) {
    n.children.forEach(c => {
      const path = document.createElementNS(ns, 'path');
      path.setAttribute('class', 'edge');
      path.setAttribute('d', `M${n.x},${n.y + 18} C${n.x},${(n.y + c.y) / 2} ${c.x},${(n.y + c.y) / 2} ${c.x},${c.y - 18}`);
      svg.appendChild(path);
      drawEdges(c);
    });
  }
  drawEdges(root);

  function drawNodes(n) {
    const g = document.createElementNS(ns, 'g');
    g.setAttribute('class', `node ${n.kind} ${n.status}`);
    g.setAttribute('transform', `translate(${n.x},${n.y})`);
    const c = document.createElementNS(ns, 'circle');
    c.setAttribute('r', n.kind === 'supervisor' ? 22 : 16);
    g.appendChild(c);
    const t = document.createElementNS(ns, 'text');
    t.textContent = n.name;
    t.setAttribute('y', 4);
    g.appendChild(t);
    const t2 = document.createElementNS(ns, 'text');
    t2.textContent = `↺${n.restarts}`;
    t2.setAttribute('y', n.kind === 'supervisor' ? 38 : 30);
    t2.setAttribute('fill', '#9ca3af');
    g.appendChild(t2);
    g.onclick = () => { if (n.kind === 'worker') crashNode(n); };
    g.style.cursor = n.kind === 'worker' ? 'pointer' : 'default';
    svg.appendChild(g);
    n.children.forEach(drawNodes);
  }
  drawNodes(root);

  const workers = [];
  (function walk(n) { if (n.kind === 'worker') workers.push(n); n.children.forEach(walk); })(root);
  stats.innerHTML = `<div>Workers: <b>${workers.length}</b></div>
    <div>Alive: <b>${workers.filter(w => w.status === 'alive').length}</b></div>
    <div>Total crashes: <b>${totalCrashes}</b></div>
    <div>Total restarts: <b>${totalRestarts}</b></div>
    <div>Strategy: <b>${strategySel.value}</b></div>`;
}

function findParent(root, target) {
  for (const c of root.children) {
    if (c === target) return root;
    const r = findParent(c, target);
    if (r) return r;
  }
  return null;
}

function crashNode(node) {
  node.status = 'crashed';
  totalCrashes++;
  render();
  setTimeout(() => applyStrategy(node), 600);
}

function applyStrategy(crashed) {
  const parent = findParent(root, crashed);
  if (!parent) return;
  const strategy = strategySel.value;
  const siblings = parent.children;
  const idx = siblings.indexOf(crashed);
  let targets = [crashed];
  if (strategy === 'all-for-one') targets = [...siblings];
  else if (strategy === 'rest-for-one') targets = siblings.slice(idx);

  targets.forEach(t => {
    if (t.status !== 'crashed') t.status = 'crashed';
    t.status = 'restarting';
  });
  render();
  setTimeout(() => {
    targets.forEach(t => {
      t.status = 'alive';
      t.restarts++;
      totalRestarts++;
    });
    render();
  }, 700);
}

document.getElementById('crash').onclick = () => {
  const workers = [];
  (function walk(n) { if (n.kind === 'worker' && n.status === 'alive') workers.push(n); n.children.forEach(walk); })(root);
  if (workers.length) crashNode(workers[Math.floor(Math.random() * workers.length)]);
};
document.getElementById('reset').onclick = () => {
  nextId = 0;
  root = buildTree();
  totalCrashes = 0;
  totalRestarts = 0;
  render();
};
window.addEventListener('resize', render);
render();

setInterval(() => {
  if (Math.random() < 0.3) document.getElementById('crash').click();
}, 3500);