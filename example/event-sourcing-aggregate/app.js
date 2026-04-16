const aggregates = [
  { id: 'order-101', type: 'Order', events: [
    { type: 'OrderCreated', data: { customer: 'Alice', items: ['Widget'] }, v: 1 },
    { type: 'ItemAdded', data: { item: 'Gadget' }, v: 2 },
    { type: 'OrderConfirmed', data: { total: 59.99 }, v: 3 },
    { type: 'PaymentReceived', data: { method: 'card', amount: 59.99 }, v: 4 },
    { type: 'OrderShipped', data: { tracking: 'TRK-8842' }, v: 5 }
  ]},
  { id: 'user-42', type: 'User', events: [
    { type: 'UserRegistered', data: { email: 'bob@test.com' }, v: 1 },
    { type: 'EmailVerified', data: {}, v: 2 },
    { type: 'ProfileUpdated', data: { name: 'Bob Smith' }, v: 3 },
    { type: 'RoleAssigned', data: { role: 'admin' }, v: 4 }
  ]},
  { id: 'cart-77', type: 'Cart', events: [
    { type: 'CartCreated', data: { userId: 'user-42' }, v: 1 },
    { type: 'ItemAdded', data: { sku: 'A1', qty: 2 }, v: 2 },
    { type: 'ItemAdded', data: { sku: 'B3', qty: 1 }, v: 3 },
    { type: 'ItemRemoved', data: { sku: 'A1' }, v: 4 },
    { type: 'CartCheckedOut', data: { total: 24.50 }, v: 5 }
  ]}
];

const reducers = {
  Order: (s, e) => {
    if (e.type === 'OrderCreated') return { status: 'created', customer: e.data.customer, items: [...e.data.items] };
    if (e.type === 'ItemAdded') return { ...s, items: [...s.items, e.data.item] };
    if (e.type === 'OrderConfirmed') return { ...s, status: 'confirmed', total: e.data.total };
    if (e.type === 'PaymentReceived') return { ...s, status: 'paid', payment: e.data };
    if (e.type === 'OrderShipped') return { ...s, status: 'shipped', tracking: e.data.tracking };
    return s;
  },
  User: (s, e) => {
    if (e.type === 'UserRegistered') return { email: e.data.email, verified: false, roles: [] };
    if (e.type === 'EmailVerified') return { ...s, verified: true };
    if (e.type === 'ProfileUpdated') return { ...s, ...e.data };
    if (e.type === 'RoleAssigned') return { ...s, roles: [...s.roles, e.data.role] };
    return s;
  },
  Cart: (s, e) => {
    if (e.type === 'CartCreated') return { userId: e.data.userId, items: [], checkedOut: false };
    if (e.type === 'ItemAdded') return { ...s, items: [...s.items, e.data] };
    if (e.type === 'ItemRemoved') return { ...s, items: s.items.filter(i => i.sku !== e.data.sku) };
    if (e.type === 'CartCheckedOut') return { ...s, checkedOut: true, total: e.data.total };
    return s;
  }
};

let current = null;

function select(agg) {
  current = agg;
  document.querySelectorAll('.agg-item').forEach(el => el.classList.toggle('active', el.dataset.id === agg.id));
  const slider = document.getElementById('slider');
  slider.max = agg.events.length; slider.value = agg.events.length;
  render();
}

function render() {
  if (!current) return;
  const upto = +document.getElementById('slider').value;
  const evtList = document.getElementById('evtList');
  evtList.innerHTML = current.events.map((e, i) =>
    `<div class="evt-item ${i >= upto ? 'dimmed' : ''}"><span class="etype">${e.type}</span> v${e.v}<br>${JSON.stringify(e.data)}</div>`
  ).join('');
  const state = current.events.slice(0, upto).reduce((s, e) => (reducers[current.type] || ((s) => s))(s, e), {});
  document.getElementById('snapPre').textContent = JSON.stringify(state, null, 2);
}

document.getElementById('aggList').innerHTML = aggregates.map(a =>
  `<div class="agg-item" data-id="${a.id}">${a.type}<br><small style="color:#6ee7b788">${a.id}</small></div>`
).join('');
document.querySelectorAll('.agg-item').forEach((el, i) => el.onclick = () => select(aggregates[i]));
document.getElementById('slider').oninput = render;
select(aggregates[0]);