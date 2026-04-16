const aggregates = ['Order', 'Payment', 'Shipment', 'Invoice', 'Customer'];
const types = ['Created', 'Updated', 'Completed', 'Cancelled', 'Refunded'];
const statuses = ['pending', 'sent', 'failed'];

let events = [];
let currentFilter = 'all';
let selectedId = null;

function randomEvent(i) {
  const agg = aggregates[Math.floor(Math.random() * aggregates.length)];
  const type = types[Math.floor(Math.random() * types.length)];
  const status = statuses[Math.floor(Math.random() * (i % 4 === 0 ? 3 : 2))];
  return {
    id: `evt_${String(i).padStart(5, '0')}`,
    aggregate: agg,
    aggregateId: `${agg.toLowerCase()}-${1000 + i}`,
    type: `${agg}${type}`,
    payload: {
      id: 1000 + i,
      actor: `user-${Math.floor(Math.random() * 100)}`,
      amount: +(Math.random() * 500).toFixed(2),
      currency: 'USD',
      timestamp: new Date(Date.now() - i * 3600000).toISOString()
    },
    attempts: status === 'failed' ? Math.floor(Math.random() * 5) + 1 : status === 'sent' ? 1 : 0,
    status,
    createdAt: new Date(Date.now() - i * 3600000)
  };
}

function seed(n = 25) {
  events = Array.from({ length: n }, (_, i) => randomEvent(i + 1));
}

function render() {
  const search = document.getElementById('search').value.toLowerCase();
  const tbody = document.getElementById('rows');
  tbody.innerHTML = '';
  const filtered = events.filter(e => {
    if (currentFilter !== 'all' && e.status !== currentFilter) return false;
    if (search && !(e.aggregate + e.type + e.aggregateId).toLowerCase().includes(search)) return false;
    return true;
  });
  filtered.forEach(e => {
    const tr = document.createElement('tr');
    if (e.id === selectedId) tr.className = 'selected';
    tr.innerHTML = `
      <td>${e.id}</td>
      <td>${e.aggregateId}</td>
      <td>${e.type}</td>
      <td>$${e.payload.amount}</td>
      <td>${e.attempts}</td>
      <td><span class="status ${e.status}">${e.status}</span></td>
      <td>${e.createdAt.toLocaleTimeString()}</td>
    `;
    tr.onclick = () => { selectedId = e.id; renderDetail(e); render(); };
    tbody.appendChild(tr);
  });
  document.getElementById('stat-pending').textContent = events.filter(e => e.status === 'pending').length;
  document.getElementById('stat-sent').textContent = events.filter(e => e.status === 'sent').length;
  document.getElementById('stat-failed').textContent = events.filter(e => e.status === 'failed').length;
}

function renderDetail(e) {
  const d = document.getElementById('detail');
  d.innerHTML = `
    <h3>${e.id} — ${e.type}</h3>
    <pre>${JSON.stringify(e.payload, null, 2)}</pre>
  `;
}

document.querySelectorAll('.filter').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.filter').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    render();
  };
});

document.getElementById('search').oninput = render;

document.getElementById('replay').onclick = () => {
  events.forEach(e => {
    if (e.status === 'failed') {
      e.status = 'sent';
      e.attempts += 1;
    }
  });
  render();
};

document.getElementById('generate').onclick = () => {
  for (let i = 0; i < 5; i++) {
    events.unshift(randomEvent(events.length + 1));
  }
  render();
};

// Relay ticker: periodically move a pending event to sent
setInterval(() => {
  const pending = events.filter(e => e.status === 'pending');
  if (pending.length) {
    const e = pending[Math.floor(Math.random() * pending.length)];
    e.status = Math.random() < 0.85 ? 'sent' : 'failed';
    e.attempts += 1;
    render();
  }
}, 2500);

seed();
render();