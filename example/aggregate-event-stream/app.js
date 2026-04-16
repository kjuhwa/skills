const events = [];
const eventsEl = document.getElementById('events');
const countEl = document.getElementById('count');
const stateEl = document.getElementById('state');
const projBody = document.querySelector('#proj tbody');

let aggregate = { id: null, status: null, items: [], total: 0, version: 0 };
const rng = () => Math.random().toString(36).slice(2, 7).toUpperCase();

const handlers = {
  PlaceOrder: () => {
    if (aggregate.status) return reject('Order already exists');
    return { type: 'OrderPlaced', orderId: 'ORD-' + rng() };
  },
  AddItem: () => {
    if (!aggregate.id) return reject('Place order first');
    if (aggregate.status !== 'OPEN') return reject(`Cannot add to ${aggregate.status}`);
    const sku = ['WIDGET', 'GADGET', 'GIZMO'][Math.floor(Math.random() * 3)];
    const price = Math.floor(Math.random() * 50) + 10;
    return { type: 'ItemAdded', sku, price };
  },
  Pay: () => {
    if (aggregate.status !== 'OPEN') return reject(`Cannot pay in ${aggregate.status}`);
    if (!aggregate.items.length) return reject('No items');
    return { type: 'OrderPaid', amount: aggregate.total };
  },
  Ship: () => {
    if (aggregate.status !== 'PAID') return reject('Must be PAID');
    return { type: 'OrderShipped', tracking: 'TRK-' + rng() };
  },
  Cancel: () => {
    if (!aggregate.id) return reject('No order');
    if (aggregate.status === 'SHIPPED') return reject('Already shipped');
    return { type: 'OrderCancelled' };
  },
};

const apply = ev => {
  switch (ev.type) {
    case 'OrderPlaced':
      aggregate = { id: ev.orderId, status: 'OPEN', items: [], total: 0, version: 1 }; break;
    case 'ItemAdded':
      aggregate.items.push({ sku: ev.sku, price: ev.price });
      aggregate.total += ev.price; break;
    case 'OrderPaid': aggregate.status = 'PAID'; break;
    case 'OrderShipped': aggregate.status = 'SHIPPED'; aggregate.tracking = ev.tracking; break;
    case 'OrderCancelled': aggregate.status = 'CANCELLED'; break;
  }
  aggregate.version++;
};

function reject(reason) { return { type: 'CommandRejected', reason, rejected: true }; }

function emit(ev) {
  ev.timestamp = new Date().toISOString().slice(11, 23);
  ev.seq = events.length + 1;
  events.push(ev);
  if (!ev.rejected) apply(ev);
  render();
}

function render() {
  eventsEl.innerHTML = events.slice().reverse().map(e =>
    `<li class="${e.rejected ? 'rejected' : ''}">
      <span class="ev">#${e.seq} ${e.type}</span>
      ${Object.entries(e).filter(([k]) => !['type', 'timestamp', 'seq', 'rejected'].includes(k))
        .map(([k, v]) => `<div>${k}: ${v}</div>`).join('')}
      <span class="ts">${e.timestamp}</span>
    </li>`).join('');
  countEl.textContent = events.length;
  stateEl.textContent = JSON.stringify(aggregate, null, 2);
  const orders = {};
  events.filter(e => !e.rejected).forEach(e => {
    if (e.type === 'OrderPlaced') orders[e.orderId] = { id: e.orderId, status: 'OPEN', total: 0, items: 0 };
    const cur = Object.values(orders).pop();
    if (!cur) return;
    if (e.type === 'ItemAdded') { cur.items++; cur.total += e.price; }
    if (e.type === 'OrderPaid') cur.status = 'PAID';
    if (e.type === 'OrderShipped') cur.status = 'SHIPPED';
    if (e.type === 'OrderCancelled') cur.status = 'CANCELLED';
  });
  projBody.innerHTML = Object.values(orders).map(o =>
    `<tr><td>${o.id}</td><td class="s-${o.status}">${o.status}</td><td>$${o.total}</td><td>${o.items}</td></tr>`
  ).join('') || '<tr><td colspan="4" style="color:#94a3b8">No orders yet</td></tr>';
}

document.querySelectorAll('[data-cmd]').forEach(b => {
  b.addEventListener('click', () => emit(handlers[b.dataset.cmd]()));
});

emit(handlers.PlaceOrder());
emit(handlers.AddItem());
emit(handlers.AddItem());
render();