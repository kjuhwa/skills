const eventStore = [];
const state = { users: 0, orders: 0, shipped: 0, total: 0 };

function dispatch(type, payload) {
  const evt = { id: eventStore.length + 1, type, payload, ts: Date.now() };
  eventStore.push(evt);
  applyEvent(evt);
  render();
}

function applyEvent(evt) {
  state.total++;
  if (evt.type === 'AddUser') state.users++;
  else if (evt.type === 'PlaceOrder') state.orders++;
  else if (evt.type === 'ShipItem') state.shipped++;
}

function render() {
  document.getElementById('stats').innerHTML =
    `<div class="stat"><b>${state.users}</b>Users</div><div class="stat"><b>${state.orders}</b>Orders</div>
     <div class="stat"><b>${state.shipped}</b>Shipped</div><div class="stat"><b>${state.total}</b>Events</div>`;
  document.getElementById('events').innerHTML = eventStore.slice().reverse()
    .map(e => `<div class="ev">#${e.id} ${e.type} ${e.payload ? '→ ' + e.payload : ''}</div>`).join('');
  document.getElementById('projection').innerHTML = eventStore.slice().reverse()
    .map(e => `<div class="ev" style="border-color:#555">${new Date(e.ts).toLocaleTimeString()} ${e.type}</div>`).join('');
}

document.getElementById('cmd-form').addEventListener('submit', e => {
  e.preventDefault();
  dispatch(document.getElementById('cmd-type').value, document.getElementById('cmd-payload').value);
  document.getElementById('cmd-payload').value = '';
});

['AddUser', 'PlaceOrder', 'ShipItem', 'PlaceOrder', 'AddUser'].forEach((t, i) =>
  setTimeout(() => dispatch(t, 'seed-' + (i + 1)), i * 80));