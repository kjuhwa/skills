const NAMES = ['Alice', 'Bob', 'Cara', 'Dan', 'Eve', 'Finn', 'Gina', 'Hal'];
const baseRows = NAMES.slice(0, 4).map((n, i) => ({ id: i + 1, name: n, email: n.toLowerCase() + '@ex.com', balance: 1000 + i * 250 }));

function genEvents(n) {
  const evts = [];
  for (let i = 0; i < n; i++) {
    const r = Math.random();
    if (r < 0.3) {
      const id = 5 + evts.filter(e => e.op === 'INSERT').length;
      const nm = NAMES[Math.floor(Math.random() * NAMES.length)];
      evts.push({ op: 'INSERT', after: { id, name: nm, email: nm.toLowerCase() + id + '@ex.com', balance: Math.floor(Math.random() * 5000) }, ts: Date.now() + i * 1000 });
    } else if (r < 0.75) {
      const id = Math.floor(Math.random() * 5) + 1;
      const delta = Math.floor(Math.random() * 400) - 200;
      evts.push({ op: 'UPDATE', key: { id }, change: { balance: delta }, ts: Date.now() + i * 1000 });
    } else {
      const id = Math.floor(Math.random() * 6) + 1;
      evts.push({ op: 'DELETE', key: { id }, ts: Date.now() + i * 1000 });
    }
  }
  return evts;
}

const events = genEvents(30);
let state = JSON.parse(JSON.stringify(baseRows));
let cursor = 0;
let playing = false;
let lastOp = null;

function applyUpTo(n) {
  state = JSON.parse(JSON.stringify(baseRows));
  lastOp = null;
  for (let i = 0; i < n; i++) {
    const e = events[i];
    if (e.op === 'INSERT') state.push({ ...e.after });
    else if (e.op === 'UPDATE') {
      const row = state.find(r => r.id === e.key.id);
      if (row) row.balance += e.change.balance;
    } else if (e.op === 'DELETE') state = state.filter(r => r.id !== e.key.id);
    if (i === n - 1) lastOp = e;
  }
}

function render() {
  const tbody = document.getElementById('rows');
  tbody.innerHTML = '';
  state.forEach(r => {
    const tr = document.createElement('tr');
    if (lastOp && lastOp.op === 'INSERT' && lastOp.after && lastOp.after.id === r.id) tr.className = 'hl-ins';
    if (lastOp && lastOp.op === 'UPDATE' && lastOp.key.id === r.id) tr.className = 'hl-upd';
    tr.innerHTML = `<td>${r.id}</td><td>${r.name}</td><td>${r.email}</td><td>$${r.balance}</td>`;
    tbody.appendChild(tr);
  });
  document.getElementById('cur').textContent = cursor;
  document.getElementById('tot').textContent = events.length;
  document.getElementById('scrub').value = cursor;
  document.getElementById('detail').textContent = lastOp ? JSON.stringify(lastOp, null, 2) : '— idle —';
}

function step(delta) {
  cursor = Math.max(0, Math.min(events.length, cursor + delta));
  applyUpTo(cursor);
  render();
}

document.getElementById('scrub').max = events.length;
document.getElementById('rewind').onclick = () => { cursor = 0; applyUpTo(0); render(); };
document.getElementById('forward').onclick = () => { cursor = events.length; applyUpTo(cursor); render(); };
document.getElementById('playPause').onclick = e => { playing = !playing; e.target.textContent = playing ? '⏸' : '▶'; };
document.getElementById('scrub').oninput = e => { cursor = +e.target.value; applyUpTo(cursor); render(); };

setInterval(() => {
  if (!playing) return;
  if (cursor >= events.length) { playing = false; document.getElementById('playPause').textContent = '▶'; return; }
  const speed = +document.getElementById('speed').value;
  step(1);
  void speed;
}, 600);

render();