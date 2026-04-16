const tree = { id: 0, parent: null, event: 'genesis', state: 0, children: [] };
let nodes = [tree];
let selected = tree;
let nextId = 1;

const apply = {
  hire: s => s + 1,
  promote: s => s * 2,
  layoff: s => Math.max(0, s - 3),
  reorg: () => 0,
};

function emit(act) {
  const newState = apply[act](selected.state);
  const node = { id: nextId++, parent: selected, event: act, state: newState, children: [] };
  selected.children.push(node);
  nodes.push(node);
  selected = node;
  render();
}

function fork() {
  if (!selected.parent) return;
  const act = ['hire','promote','layoff','reorg'][Math.floor(Math.random()*4)];
  const newState = apply[act](selected.parent.state);
  const node = { id: nextId++, parent: selected.parent, event: act + '*', state: newState, children: [] };
  selected.parent.children.push(node);
  nodes.push(node);
  selected = node;
  render();
}

document.querySelectorAll('[data-act]').forEach(b =>
  b.addEventListener('click', () => emit(b.dataset.act)));
document.getElementById('fork').addEventListener('click', fork);

function layout() {
  const depths = new Map();
  function walk(n, d) {
    if (!depths.has(d)) depths.set(d, []);
    depths.get(d).push(n);
    n.children.forEach(c => walk(c, d + 1));
  }
  walk(tree, 0);
  const maxDepth = Math.max(...depths.keys());
  depths.forEach((arr, d) => {
    arr.forEach((n, i) => {
      n.x = 60 + (d / Math.max(maxDepth, 1)) * 680;
      n.y = 40 + ((i + 1) / (arr.length + 1)) * 420;
    });
  });
}

function pathToRoot(n) {
  const p = [];
  while (n) { p.push(n); n = n.parent; }
  return p;
}

function render() {
  layout();
  const svg = document.getElementById('tree');
  const activePath = new Set(pathToRoot(selected).map(n => n.id));
  let html = '';
  for (const n of nodes) {
    if (n.parent) {
      const active = activePath.has(n.id) && activePath.has(n.parent.id);
      const dx = (n.x + n.parent.x) / 2;
      html += `<path class="edge ${active ? 'active' : ''}" d="M${n.parent.x},${n.parent.y} C${dx},${n.parent.y} ${dx},${n.y} ${n.x},${n.y}"/>`;
    }
  }
  for (const n of nodes) {
    const isSel = n === selected;
    const fill = isSel ? '#6ee7b7' : activePath.has(n.id) ? '#2d6e5d' : '#1e2230';
    const stroke = isSel ? '#6ee7b7' : '#6ee7b7';
    html += `<g class="node" data-id="${n.id}">
      <circle cx="${n.x}" cy="${n.y}" r="12" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>
      <text x="${n.x}" y="${n.y - 18}" text-anchor="middle">${n.event}</text>
      <text x="${n.x}" y="${n.y + 28}" text-anchor="middle">${n.state}</text>
    </g>`;
  }
  svg.innerHTML = html;
  svg.querySelectorAll('.node').forEach(g => {
    g.addEventListener('click', () => {
      selected = nodes.find(n => n.id === +g.dataset.id);
      render();
    });
  });
  document.getElementById('node-id').textContent = '#' + selected.id;
  document.getElementById('node-event').textContent = selected.event;
  document.getElementById('node-state').textContent = selected.state;
  document.getElementById('node-depth').textContent = pathToRoot(selected).length - 1;
}

['hire','hire','promote','hire','layoff','promote'].forEach(emit);
selected = nodes[3];
['promote','hire'].forEach(emit);
selected = nodes[2];
['layoff','reorg','hire'].forEach(emit);
selected = tree;
render();