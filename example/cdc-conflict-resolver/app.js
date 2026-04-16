const queueList = document.getElementById('queueList');
const resolverBody = document.getElementById('resolverBody');
const pendingCount = document.getElementById('pendingCount');
const resolvedCount = document.getElementById('resolvedCount');
const genBtn = document.getElementById('genBtn');

const TABLES = ['orders', 'users', 'products', 'sessions'];
const FIELDS = {
  orders: ['status', 'total', 'shipped_at'],
  users: ['email', 'name', 'tier'],
  products: ['price', 'stock', 'category'],
  sessions: ['device', 'expires_at', 'ip']
};
const STATUSES = ['pending', 'paid', 'shipped', 'cancelled'];
const TIERS = ['free', 'pro', 'enterprise'];
const DEVICES = ['iPhone', 'Android', 'Desktop', 'Tablet'];
const CATS = ['electronics', 'apparel', 'books', 'home'];

let conflicts = [];
let activeId = null;
let nextId = 1;

function rnd(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function rndVal(field) {
  if (field === 'status') return rnd(STATUSES);
  if (field === 'total' || field === 'price') return '$' + (Math.random() * 900 + 10).toFixed(2);
  if (field === 'stock') return Math.floor(Math.random() * 500);
  if (field === 'shipped_at' || field === 'expires_at') return new Date(Date.now() + Math.random() * 1e10).toISOString().slice(0, 10);
  if (field === 'email') return `user${Math.floor(Math.random() * 999)}@ex.io`;
  if (field === 'name') return rnd(['Alex', 'Sam', 'Jordan', 'Casey', 'Riley']);
  if (field === 'tier') return rnd(TIERS);
  if (field === 'device') return rnd(DEVICES);
  if (field === 'ip') return Array.from({ length: 4 }, () => Math.floor(Math.random() * 255)).join('.');
  if (field === 'category') return rnd(CATS);
  return '?';
}

function genConflict() {
  const tbl = rnd(TABLES);
  const fields = FIELDS[tbl];
  const id = Math.floor(Math.random() * 9999);
  const a = {}; const b = {};
  fields.forEach(f => {
    a[f] = rndVal(f);
    b[f] = Math.random() < 0.6 ? rndVal(f) : a[f];
  });
  if (fields.every(f => a[f] === b[f])) b[fields[0]] = rndVal(fields[0]);
  conflicts.push({
    id: nextId++,
    table: tbl,
    pk: id,
    a: { region: 'us-east', ts: Date.now() - Math.floor(Math.random() * 5000), data: a },
    b: { region: 'eu-west', ts: Date.now() - Math.floor(Math.random() * 5000), data: b },
    resolved: false,
    strategy: null
  });
  render();
}

function render() {
  queueList.innerHTML = '';
  conflicts.forEach(c => {
    const li = document.createElement('li');
    li.className = (c.id === activeId ? 'active ' : '') + (c.resolved ? 'resolved' : '');
    li.innerHTML = `
      <div class="q-row q-title">#${c.id} · ${c.table}[${c.pk}]</div>
      <div class="q-row q-meta">${c.resolved ? '✓ ' + c.strategy : 'us-east ⟷ eu-west'}</div>`;
    li.onclick = () => { activeId = c.id; render(); };
    queueList.appendChild(li);
  });
  pendingCount.textContent = conflicts.filter(c => !c.resolved).length;
  resolvedCount.textContent = conflicts.filter(c => c.resolved).length;
  renderResolver();
}

function renderResolver() {
  const c = conflicts.find(x => x.id === activeId);
  if (!c) { resolverBody.innerHTML = '<p class="empty">Select a conflict from the queue →</p>'; return; }
  const fields = Object.keys(c.a.data);
  const paneHTML = (side, label, cls) => `
    <div class="pane ${cls}">
      <h3>${label} · ${new Date(side.ts).toLocaleTimeString()}</h3>
      ${fields.map(f => {
        const conflict = c.a.data[f] !== c.b.data[f];
        return `<div class="field ${conflict ? 'conflict' : ''}"><span class="k">${f}:</span> ${side.data[f]}</div>`;
      }).join('')}
    </div>`;
  resolverBody.innerHTML = `
    <div class="diff-grid">
      ${paneHTML(c.a, 'Source A · us-east', 'source-a')}
      <div class="vs">⚡</div>
      ${paneHTML(c.b, 'Source B · eu-west', 'source-b')}
    </div>
    <div class="actions">
      <button class="btn-a" data-act="a">Keep A (us-east)</button>
      <button class="btn-b" data-act="b">Keep B (eu-west)</button>
      <button class="btn-merge" data-act="lww">Last-Write-Wins</button>
      <button class="btn-merge" data-act="merge">Field Merge</button>
    </div>`;
  resolverBody.querySelectorAll('button').forEach(btn => {
    btn.onclick = () => resolve(c, btn.dataset.act);
  });
}

function resolve(c, act) {
  const map = { a: 'Kept A', b: 'Kept B', lww: 'LWW (' + (c.a.ts > c.b.ts ? 'A' : 'B') + ')', merge: 'Field Merge' };
  c.resolved = true;
  c.strategy = map[act];
  render();
}

genBtn.onclick = genConflict;
for (let i = 0; i < 4; i++) genConflict();
activeId = conflicts[0].id;
render();