const colors = ['#6ee7b7', '#93c5fd', '#fca5a5', '#fcd34d', '#c4b5fd', '#f9a8d4', '#86efac', '#a5b4fc'];
const TOTAL_KEYS = 200;

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const keys = Array.from({ length: TOTAL_KEYS }, (_, i) => `k${i}`);
let nodes = ['A', 'B', 'C', 'D'];

function modAssign(nodeList) {
  const out = {};
  keys.forEach(k => out[k] = nodeList[hash(k) % nodeList.length]);
  return out;
}

function buildRing(nodeList, vnodes = 40) {
  const ring = [];
  nodeList.forEach(n => {
    for (let i = 0; i < vnodes; i++) ring.push({ pos: hash(`${n}#${i}`) / 0xFFFFFFFF, node: n });
  });
  ring.sort((a, b) => a.pos - b.pos);
  return ring;
}

function ringAssign(nodeList) {
  const ring = buildRing(nodeList);
  const out = {};
  keys.forEach(k => {
    const p = hash(k) / 0xFFFFFFFF;
    let owner = ring[0].node;
    for (let e of ring) if (e.pos >= p) { owner = e.node; break; }
    out[k] = owner;
  });
  return out;
}

let prevMod = modAssign(nodes);
let prevCons = ringAssign(nodes);
let lastAction = null;

function colorOf(n) { return colors[(n.charCodeAt(0) - 65) % colors.length]; }

function renderGrid(gridId, assignment, prev) {
  const grid = document.getElementById(gridId);
  grid.innerHTML = '';
  let moved = 0;
  keys.forEach(k => {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.style.background = colorOf(assignment[k]);
    cell.title = `${k} → ${assignment[k]}`;
    if (prev && prev[k] !== assignment[k]) {
      cell.classList.add('moved');
      moved++;
    }
    grid.appendChild(cell);
  });
  return moved;
}

function log(msg) {
  const el = document.getElementById('log');
  const d = document.createElement('div');
  d.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  el.prepend(d);
  while (el.children.length > 20) el.removeChild(el.lastChild);
}

function apply(action) {
  lastAction = action;
  const before = [...nodes];
  if (action === 'add') nodes.push(String.fromCharCode(65 + nodes.length));
  else if (action === 'remove' && nodes.length > 1) nodes.pop();

  const newMod = modAssign(nodes);
  const newCons = ringAssign(nodes);
  const modMoved = renderGrid('modGrid', newMod, prevMod);
  const consMoved = renderGrid('consGrid', newCons, prevCons);
  document.getElementById('modMoved').textContent = modMoved;
  document.getElementById('modTotal').textContent = TOTAL_KEYS;
  document.getElementById('consMoved').textContent = consMoved;
  document.getElementById('consTotal').textContent = TOTAL_KEYS;
  document.getElementById('nodeCount').textContent = nodes.length;

  log(`${action === 'add' ? 'Added' : 'Removed'} node · modulo moved ${modMoved}, consistent moved ${consMoved}`);
  prevMod = newMod;
  prevCons = newCons;
}

document.getElementById('addNode').onclick = () => apply('add');
document.getElementById('removeNode').onclick = () => apply('remove');
document.getElementById('replay').onclick = () => { if (lastAction) apply(lastAction); };

renderGrid('modGrid', prevMod, null);
renderGrid('consGrid', prevCons, null);
document.getElementById('modTotal').textContent = TOTAL_KEYS;
document.getElementById('consTotal').textContent = TOTAL_KEYS;
log('Initialized with 4 nodes · try adding or removing');