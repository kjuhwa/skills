const NODES = ['A', 'B', 'C', 'D'];
const state = {
  replicas: Object.fromEntries(NODES.map(n => [n, Object.fromEntries(NODES.map(m => [m, 0]))])),
  partitioned: false,
};

const clusterEl = document.getElementById('cluster');
const logEl = document.getElementById('log');
const statusEl = document.getElementById('status');

function total(vector) {
  return Object.values(vector).reduce((a, b) => a + b, 0);
}

function merge(a, b) {
  const out = {};
  for (const k of NODES) out[k] = Math.max(a[k] || 0, b[k] || 0);
  return out;
}

function log(msg) {
  const li = document.createElement('li');
  const t = new Date().toLocaleTimeString();
  li.textContent = `[${t}] ${msg}`;
  logEl.prepend(li);
  while (logEl.children.length > 50) logEl.lastChild.remove();
}

function render() {
  clusterEl.innerHTML = '';
  for (const node of NODES) {
    const v = state.replicas[node];
    const div = document.createElement('div');
    div.className = 'replica' + (state.partitioned && (node === 'C' || node === 'D') ? ' partitioned' : '');
    div.innerHTML = `
      <h2>Replica ${node}</h2>
      <div class="total">${total(v)}</div>
      <div class="vector">${NODES.map(n => `${n}:${v[n]}`).join(' ')}</div>
      <button class="inc-btn" data-node="${node}">Increment</button>
    `;
    clusterEl.appendChild(div);
  }
  statusEl.innerHTML = `Network: <b>${state.partitioned ? 'partitioned (A/B ⇄ C/D)' : 'open'}</b>`;
}

clusterEl.addEventListener('click', e => {
  const btn = e.target.closest('.inc-btn');
  if (!btn) return;
  const node = btn.dataset.node;
  state.replicas[node][node]++;
  log(`${node} incremented → ${total(state.replicas[node])}`);
  render();
});

document.getElementById('sync').addEventListener('click', () => {
  const groups = state.partitioned ? [['A', 'B'], ['C', 'D']] : [NODES];
  for (const group of groups) {
    let merged = {};
    for (const n of NODES) merged[n] = 0;
    for (const n of group) merged = merge(merged, state.replicas[n]);
    for (const n of group) state.replicas[n] = { ...merged };
    log(`Synced [${group.join(',')}] → total ${total(merged)}`);
  }
  render();
});

document.getElementById('partition').addEventListener('click', () => {
  state.partitioned = !state.partitioned;
  log(`Partition ${state.partitioned ? 'ENABLED' : 'healed'}`);
  render();
});

document.getElementById('reset').addEventListener('click', () => {
  for (const n of NODES) for (const m of NODES) state.replicas[n][m] = 0;
  logEl.innerHTML = '';
  log('Cluster reset');
  render();
});

// seed some activity
state.replicas.A.A = 3;
state.replicas.B.B = 2;
state.replicas.C.C = 1;
log('Seeded with initial increments on A, B, C');
render();