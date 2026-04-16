const nodes = ['A', 'B', 'C'];
const state = {
  A: { A: 0, B: 0, C: 0 },
  B: { A: 0, B: 0, C: 0 },
  C: { A: 0, B: 0, C: 0 },
};
let partitioned = false;
const logEl = document.getElementById('log');

function log(msg, cls = '') {
  const div = document.createElement('div');
  div.className = 'entry ' + cls;
  div.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  logEl.prepend(div);
}

function total(replica) {
  return Object.values(state[replica]).reduce((a, b) => a + b, 0);
}

function merge(a, b) {
  const out = {};
  for (const k of nodes) out[k] = Math.max(a[k] || 0, b[k] || 0);
  return out;
}

function render() {
  const container = document.getElementById('replicas');
  container.innerHTML = '';
  for (const n of nodes) {
    const div = document.createElement('div');
    div.className = 'replica';
    const vec = Object.entries(state[n]).map(([k, v]) => `${k}:${v}`).join(' ');
    div.innerHTML = `
      <h2>Replica ${n}</h2>
      <div class="total">${total(n)}</div>
      <div class="vector">{ ${vec} }</div>
      <button data-node="${n}">Increment</button>
    `;
    div.querySelector('button').onclick = () => increment(n);
    container.appendChild(div);
  }
}

function increment(n) {
  state[n][n] += 1;
  log(`Replica ${n} incremented → ${total(n)}`, 'inc');
  render();
  if (!partitioned) {
    setTimeout(() => gossipFrom(n), 400);
  }
}

function gossipFrom(source) {
  for (const target of nodes) {
    if (target !== source) {
      state[target] = merge(state[target], state[source]);
    }
  }
  render();
}

function syncAll() {
  const merged = nodes.reduce((acc, n) => merge(acc, state[n]), { A: 0, B: 0, C: 0 });
  for (const n of nodes) state[n] = { ...merged };
  log('All replicas synced via merge (max per node)', 'sync');
  render();
}

document.getElementById('syncAll').onclick = syncAll;
document.getElementById('partitionToggle').onclick = () => {
  partitioned = !partitioned;
  document.getElementById('partitionStatus').textContent =
    partitioned ? 'Network: Partitioned' : 'Network: Connected';
  log(partitioned ? 'Network partitioned' : 'Network healed', 'part');
};

// seed
state.A.A = 3; state.B.B = 2; state.C.C = 1;
state.A = merge(state.A, state.B);
log('Initialized with simulated edits');
render();