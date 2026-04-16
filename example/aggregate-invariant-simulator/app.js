const state = { id: 'ORD-' + Math.floor(Math.random()*9000+1000), status: 'DRAFT', items: [], total: 0, discountApplied: false };
const log = [];
const stateView = document.getElementById('state-view');
const logEl = document.getElementById('log');
const catalog = ['Keyboard', 'Monitor', 'Desk Lamp', 'Headset', 'Webcam', 'Mouse Pad', 'USB Hub'];

const invariants = {
  add: () => state.status === 'DRAFT' ? null : 'Cannot modify items after order is ' + state.status,
  remove: () => state.status !== 'DRAFT' ? 'Cannot modify items after order is ' + state.status
            : state.items.length === 0 ? 'No items to remove' : null,
  discount: () => state.status !== 'DRAFT' ? 'Discount only valid on DRAFT orders'
              : state.discountApplied ? 'Discount already applied'
              : state.total < 50 ? 'Minimum $50 required for discount' : null,
  submit: () => state.status !== 'DRAFT' ? 'Already ' + state.status
            : state.items.length === 0 ? 'Cannot submit empty order' : null,
  cancel: () => state.status === 'CANCELLED' ? 'Already cancelled' : null,
};

const handlers = {
  add: () => {
    const name = catalog[Math.floor(Math.random()*catalog.length)];
    const price = Math.floor(Math.random()*80+10);
    state.items.push({ name, price });
    state.total += price;
    return `ItemAdded: ${name} ($${price})`;
  },
  remove: () => {
    const removed = state.items.pop();
    state.total -= removed.price;
    return `ItemRemoved: ${removed.name}`;
  },
  discount: () => {
    const d = Math.round(state.total * 0.2);
    state.total -= d;
    state.discountApplied = true;
    return `DiscountApplied: -$${d}`;
  },
  submit: () => { state.status = 'SUBMITTED'; return `OrderSubmitted: $${state.total}`; },
  cancel: () => { state.status = 'CANCELLED'; return `OrderCancelled`; },
  reset: () => { Object.assign(state, { id: 'ORD-' + Math.floor(Math.random()*9000+1000), status:'DRAFT', items:[], total:0, discountApplied:false }); log.length = 0; return null; }
};

function render() {
  stateView.innerHTML = `
    <div class="field"><span>id</span><span>${state.id}</span></div>
    <div class="field"><span>status</span><span class="status-${state.status}">${state.status}</span></div>
    <div class="field"><span>total</span><span>$${state.total}</span></div>
    <div class="field"><span>discount</span><span>${state.discountApplied ? 'yes' : 'no'}</span></div>
    <div class="items">${state.items.map(i => `<div class="item"><span>${i.name}</span><span>$${i.price}</span></div>`).join('') || '<div class="item"><span style="color:#8b93a7">— empty —</span></div>'}</div>`;
  logEl.innerHTML = log.slice(-20).reverse().map(l => `<li class="${l.ok?'':'rejected'}"><span class="t">${l.t}</span>${l.msg}</li>`).join('');
}

document.querySelectorAll('button').forEach(btn => btn.addEventListener('click', () => {
  const cmd = btn.dataset.cmd;
  if (cmd === 'reset') { handlers.reset(); render(); return; }
  const violation = invariants[cmd]();
  const t = new Date().toLocaleTimeString();
  if (violation) log.push({ ok: false, t, msg: `✗ ${cmd} → ${violation}` });
  else log.push({ ok: true, t, msg: `✓ ${handlers[cmd]()}` });
  render();
}));
render();