const store = [];
let nextId = 1000;
const openOrders = new Map();

function append(type, payload) {
  const e = { seq: store.length, ts: Date.now(), type, ...payload };
  store.push(e);
  renderAll();
}

const commands = {
  PlaceOrder() {
    const id = nextId++;
    const amount = Math.floor(Math.random() * 200) + 20;
    openOrders.set(id, { amount, status: 'placed' });
    append('OrderPlaced', { id, amount });
  },
  ShipOrder() {
    const candidate = [...openOrders.entries()].find(([, o]) => o.status === 'placed');
    if (!candidate) return;
    const [id, o] = candidate;
    o.status = 'shipped';
    append('OrderShipped', { id, amount: o.amount });
  },
  CancelOrder() {
    const candidate = [...openOrders.entries()].find(([, o]) => o.status === 'placed');
    if (!candidate) return;
    const [id] = candidate;
    openOrders.get(id).status = 'cancelled';
    append('OrderCancelled', { id });
  },
  RefundOrder() {
    const candidate = [...openOrders.entries()].find(([, o]) => o.status === 'shipped');
    if (!candidate) return;
    const [id, o] = candidate;
    o.status = 'refunded';
    append('OrderRefunded', { id, amount: o.amount });
  },
  Reset() {
    store.length = 0;
    openOrders.clear();
    nextId = 1000;
    renderAll();
  },
};

document.querySelectorAll('[data-cmd]').forEach(btn => {
  btn.addEventListener('click', () => commands[btn.dataset.cmd]());
});

function projectStatus() {
  const counts = { placed: 0, shipped: 0, cancelled: 0, refunded: 0 };
  for (const e of store) {
    if (e.type === 'OrderPlaced') counts.placed++;
    if (e.type === 'OrderShipped') { counts.placed--; counts.shipped++; }
    if (e.type === 'OrderCancelled') { counts.placed--; counts.cancelled++; }
    if (e.type === 'OrderRefunded') { counts.shipped--; counts.refunded++; }
  }
  return counts;
}

function projectRevenue() {
  let rev = 0, shipped = 0, refunded = 0;
  for (const e of store) {
    if (e.type === 'OrderShipped') { rev += e.amount; shipped++; }
    if (e.type === 'OrderRefunded') { rev -= e.amount; refunded++; }
  }
  return { rev, shipped, refunded };
}

function renderAll() {
  const evEl = document.getElementById('events');
  evEl.innerHTML = store.map(e =>
    `<li><span class="type">${e.type}</span> ${e.id ?? ''} ${e.amount ? '$' + e.amount : ''}</li>`
  ).join('');
  evEl.scrollTop = evEl.scrollHeight;

  const s = projectStatus();
  document.getElementById('by-status').innerHTML =
    Object.entries(s).map(([k, v]) =>
      `<div class="bucket"><div class="n">${Math.max(0, v)}</div><div class="l">${k}</div></div>`
    ).join('');

  const r = projectRevenue();
  document.getElementById('revenue').textContent = '$' + r.rev.toLocaleString();
  document.getElementById('rev-detail').textContent = `${r.shipped} shipped · ${r.refunded} refunded`;

  const svg = document.getElementById('heatmap');
  const cells = 60;
  const buckets = new Array(cells).fill(0);
  store.forEach((e, i) => { buckets[Math.floor((i / Math.max(store.length, 1)) * (cells - 1))]++; });
  const max = Math.max(...buckets, 1);
  svg.innerHTML = buckets.map((v, i) => {
    const alpha = v / max;
    return `<rect x="${i * 5}" y="10" width="4" height="60" fill="rgba(110,231,183,${alpha * 0.9 + 0.05})" rx="1"/>`;
  }).join('');
}

['PlaceOrder','PlaceOrder','PlaceOrder','ShipOrder','PlaceOrder','ShipOrder','CancelOrder','RefundOrder']
  .forEach(c => commands[c]());